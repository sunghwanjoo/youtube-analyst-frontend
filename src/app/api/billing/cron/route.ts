import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, and, lte } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, paymentLogs, userPlan } from "@/db/schema";
import { chargeBilling } from "@/lib/toss";
import { PAID_PLAN_ORDER_NAME } from "@/lib/pricing";
import { addOneMonth, todayKSTDateString } from "@/lib/date";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = todayKSTDateString();
  const results: Array<{ userId: string; result: string }> = [];

  // 1) 활성 구독 중 결제일 도래 → 청구 시도
  const dueActive = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "active"), lte(subscriptions.nextBillingAt, today)));

  for (const sub of dueActive) {
    try {
      const charge = await chargeBilling({
        billingKey: sub.billingKey,
        customerKey: sub.customerKey,
        amount: sub.priceKrw,
        orderId: randomUUID(),
        orderName: PAID_PLAN_ORDER_NAME,
      });

      await db
        .update(subscriptions)
        .set({ nextBillingAt: addOneMonth(sub.nextBillingAt) })
        .where(eq(subscriptions.id, sub.id));

      await db.insert(paymentLogs).values({
        id: randomUUID(),
        userId: sub.userId,
        amount: sub.priceKrw,
        status: "success",
        tossResponse: charge,
      });

      results.push({ userId: sub.userId, result: "charged" });
    } catch (e: any) {
      await db
        .update(subscriptions)
        .set({ status: "past_due" })
        .where(eq(subscriptions.id, sub.id));

      await db
        .update(userPlan)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(userPlan.userId, sub.userId));

      await db.insert(paymentLogs).values({
        id: randomUUID(),
        userId: sub.userId,
        amount: sub.priceKrw,
        status: "failed",
        tossResponse: { error: e.message },
      });

      results.push({ userId: sub.userId, result: "charge_failed" });
    }
  }

  // 2) 해지 예약된 구독 중 결제일 도래 → free로 강등 (재청구 안 함)
  const dueCancelled = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "cancelled"), lte(subscriptions.nextBillingAt, today)));

  for (const sub of dueCancelled) {
    await db
      .update(userPlan)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(userPlan.userId, sub.userId));
    results.push({ userId: sub.userId, result: "downgraded_after_cancel" });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
