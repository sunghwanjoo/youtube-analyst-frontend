import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { extractScript } from "@/lib/script";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const { video_url } = await req.json();
  if (!video_url?.trim()) {
    return NextResponse.json({ detail: "영상 URL을 입력해주세요." }, { status: 400 });
  }

  try {
    const result = await extractScript(video_url);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "스크립트 추출 실패" }, { status: 400 });
  }
}
