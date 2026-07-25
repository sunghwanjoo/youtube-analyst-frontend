import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requirePaidPlan } from "@/lib/session";
import { db } from "@/db";
import { workshopItems } from "@/db/schema";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const { id } = await params;
  const [item] = await db
    .select()
    .from(workshopItems)
    .where(and(eq(workshopItems.id, id), eq(workshopItems.userId, session!.user.id)))
    .limit(1);

  if (!item) return NextResponse.json({ detail: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const allowed: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of [
    "keyword",
    "sourceTitle",
    "sourceDescription",
    "sourceScript",
    "generatedTitles",
    "generatedScripts",
  ] as const) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const [row] = await db
    .update(workshopItems)
    .set(allowed)
    .where(and(eq(workshopItems.id, id), eq(workshopItems.userId, session!.user.id)))
    .returning();

  if (!row) return NextResponse.json({ detail: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ item: row });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const { id } = await params;
  await db
    .delete(workshopItems)
    .where(and(eq(workshopItems.id, id), eq(workshopItems.userId, session!.user.id)));

  return NextResponse.json({ ok: true });
}
