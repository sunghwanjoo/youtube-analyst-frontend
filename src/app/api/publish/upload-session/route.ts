import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requirePaidPlan } from "@/lib/session";
import { getFreshGoogleAccessToken, openResumableUploadSession } from "@/lib/youtube-channel";
import { db } from "@/db";
import { scheduledPublishes } from "@/db/schema";

export async function POST(req: NextRequest) {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const { scheduleId, fileSizeBytes, fileMimeType } = await req.json();
  if (!scheduleId || !fileSizeBytes || !fileMimeType) {
    return NextResponse.json({ detail: "잘못된 요청입니다." }, { status: 400 });
  }

  const [schedule] = await db
    .select()
    .from(scheduledPublishes)
    .where(and(eq(scheduledPublishes.id, scheduleId), eq(scheduledPublishes.userId, session!.user.id)))
    .limit(1);

  if (!schedule) {
    return NextResponse.json({ detail: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const accessToken = await getFreshGoogleAccessToken(session!.user.id);
    const uploadUrl = await openResumableUploadSession({
      accessToken,
      title: schedule.title,
      description: schedule.description,
      tags: schedule.tags,
      fileSizeBytes,
      fileMimeType,
    });

    return NextResponse.json({ uploadUrl });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "업로드 세션 생성 실패" }, { status: 400 });
  }
}
