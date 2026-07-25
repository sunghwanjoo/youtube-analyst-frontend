import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { requirePaidPlan } from "@/lib/session";
import { db } from "@/db";
import { workshopItems } from "@/db/schema";

export async function GET() {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const items = await db
    .select()
    .from(workshopItems)
    .where(eq(workshopItems.userId, session!.user.id))
    .orderBy(desc(workshopItems.createdAt));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const body = await req.json();
  const {
    keyword,
    sourceVideoId,
    sourceTitle,
    sourceDescription,
    sourceThumbnailUrl,
    sourceScript,
    generatedTitles,
    generatedScripts,
  } = body;

  if (!keyword?.trim() || !sourceVideoId || !sourceTitle) {
    return NextResponse.json({ detail: "잘못된 요청입니다." }, { status: 400 });
  }

  const [row] = await db
    .insert(workshopItems)
    .values({
      id: randomUUID(),
      userId: session!.user.id,
      keyword,
      sourceVideoId,
      sourceTitle,
      sourceDescription: sourceDescription ?? "",
      sourceThumbnailUrl: sourceThumbnailUrl ?? null,
      sourceScript: sourceScript ?? "",
      generatedTitles: generatedTitles ?? [],
      generatedScripts: generatedScripts ?? [],
    })
    .returning();

  return NextResponse.json({ item: row });
}
