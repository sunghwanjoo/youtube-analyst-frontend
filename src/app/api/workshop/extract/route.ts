import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { extractScript } from "@/lib/script";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const { videoId }: { videoId: string } = await req.json();

  if (!videoId) {
    return NextResponse.json({ detail: "영상이 필요합니다." }, { status: 400 });
  }

  try {
    const script = await extractScript(`https://youtube.com/watch?v=${videoId}`);

    return NextResponse.json({
      sourceVideoId: script.video_id,
      sourceTitle: script.title,
      sourceDescription: script.description,
      sourceThumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      sourceScript: script.cleaned_script,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "추출 실패" }, { status: 400 });
  }
}
