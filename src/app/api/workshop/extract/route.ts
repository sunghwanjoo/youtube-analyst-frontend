import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { extractScript, rewriteScript } from "@/lib/script";
import { analyzeTitlePatterns, generateSeoTitles } from "@/lib/seo";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const {
    videoId,
    keyword,
    topTitles,
    avgSubscribers = 0,
  }: {
    videoId: string;
    keyword: string;
    topTitles?: string[];
    avgSubscribers?: number;
  } = await req.json();

  if (!videoId || !keyword?.trim()) {
    return NextResponse.json({ detail: "영상과 키워드는 필수입니다." }, { status: 400 });
  }

  try {
    const script = await extractScript(`https://youtube.com/watch?v=${videoId}`);
    const topTitlesFinal = topTitles?.length ? topTitles : [script.title];
    const pattern = analyzeTitlePatterns(topTitlesFinal);

    const { competitionLevel, competitionReason, titles } = await generateSeoTitles({
      keyword,
      topVideoTitles: topTitlesFinal,
      pattern,
      avgSubscribers,
    });

    const scriptVersions = await rewriteScript(
      script.cleaned_script,
      keyword,
      titles.map((t) => t.title),
      titles.length
    );

    return NextResponse.json({
      keyword,
      sourceVideoId: script.video_id,
      sourceTitle: script.title,
      sourceDescription: script.description,
      sourceThumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      sourceScript: script.cleaned_script,
      generatedTitles: titles,
      generatedScripts: scriptVersions,
      competitionLevel,
      competitionReason,
      patternAnalysis: pattern,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "추출/생성 실패" }, { status: 400 });
  }
}
