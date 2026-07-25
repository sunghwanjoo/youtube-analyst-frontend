import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "@/lib/session";
import { issueBillingKey, chargeBilling } from "@/lib/toss";
import { PAID_PLAN_PRICE_KRW, PAID_PLAN_ORDER_NAME } from "@/lib/pricing";
import { addOneMonth, todayKSTDateString } from "@/lib/date";
import { db } from "@/db";
import { subscriptions, paymentLogs, userPlan } from "@/db/schema";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ detail: "로그인이 필요합니다." }, { status: 401 });
  }

  const { authKey, customerKey } = await req.json();
  if (!authKey || !customerKey) {
    return NextResponse.json({ detail: "잘못된 요청입니다." }, { status: 400 });
  }
  if (customerKey !== session.user.id) {
    return NextResponse.json({ detail: "customerKey가 일치하지 않습니다." }, { status: 400 });
  }

  try {
    const issued = await issueBillingKey(authKey, customerKey);
    const billingKey: string = issued.billingKey;

    const orderId = randomUUID();
    const charge = await chargeBilling({
      billingKey,
      customerKey,
      amount: PAID_PLAN_PRICE_KRW,
      orderId,
      orderName: PAID_PLAN_ORDER_NAME,
    });

    await db.insert(subscriptions).values({
      id: randomUUID(),
      userId: session.user.id,
      billingKey,
      customerKey,
      status: "active",
      nextBillingAt: addOneMonth(todayKSTDateString()),
      priceKrw: PAID_PLAN_PRICE_KRW,
    });

    await db.insert(paymentLogs).values({
      id: randomUUID(),
      userId: session.user.id,
      amount: PAID_PLAN_PRICE_KRW,
      status: "success",
      tossResponse: charge,
    });

    await db
      .insert(userPlan)
      .values({ userId: session.user.id, plan: "paid" })
      .onConflictDoUpdate({ target: userPlan.userId, set: { plan: "paid", updatedAt: new Date() } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await db.insert(paymentLogs).values({
      id: randomUUID(),
      userId: session.user.id,
      amount: PAID_PLAN_PRICE_KRW,
      status: "failed",
      tossResponse: { error: e.message },
    });
    return NextResponse.json({ detail: `결제 등록 실패: ${e.message}` }, { status: 400 });
  }
}
