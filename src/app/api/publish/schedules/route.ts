import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { requirePaidPlan } from "@/lib/session";
import { db } from "@/db";
import { scheduledPublishes } from "@/db/schema";

export async function GET() {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const items = await db
    .select()
    .from(scheduledPublishes)
    .where(eq(scheduledPublishes.userId, session!.user.id))
    .orderBy(desc(scheduledPublishes.scheduledAt));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const { channelId, title, description, tags, script, scheduledAt } = await req.json();
  if (!channelId || !title?.trim() || !scheduledAt) {
    return NextResponse.json({ detail: "채널, 제목, 예정시각은 필수입니다." }, { status: 400 });
  }

  const [row] = await db
    .insert(scheduledPublishes)
    .values({
      id: randomUUID(),
      userId: session!.user.id,
      channelId,
      title,
      description: description ?? "",
      tags: tags ?? [],
      script: script ?? "",
      scheduledAt: new Date(scheduledAt),
      status: "pending",
    })
    .returning();

  return NextResponse.json({ item: row });
}
