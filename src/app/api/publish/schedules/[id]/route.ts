import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requirePaidPlan } from "@/lib/session";
import { db } from "@/db";
import { scheduledPublishes } from "@/db/schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  if (body.status) allowed.status = body.status;

  const [row] = await db
    .update(scheduledPublishes)
    .set(allowed)
    .where(and(eq(scheduledPublishes.id, id), eq(scheduledPublishes.userId, session!.user.id)))
    .returning();

  if (!row) return NextResponse.json({ detail: "예약을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ item: row });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const { id } = await params;
  await db
    .delete(scheduledPublishes)
    .where(and(eq(scheduledPublishes.id, id), eq(scheduledPublishes.userId, session!.user.id)));

  return NextResponse.json({ ok: true });
}
