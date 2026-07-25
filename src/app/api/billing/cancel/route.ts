import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ detail: "로그인이 필요합니다." }, { status: 401 });
  }

  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptions.userId, session.user.id), eq(subscriptions.status, "active")));

  return NextResponse.json({
    ok: true,
    message: "해지 처리되었습니다. 다음 결제일까지는 계속 이용하실 수 있어요.",
  });
}
