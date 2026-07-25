import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { rewriteScript } from "@/lib/script";
import { analyzeTitlePatterns, generateSeoTitles } from "@/lib/seo";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const {
    keyword,
    sourceScript,
    topTitles,
    avgSubscribers = 0,
  }: {
    keyword: string;
    sourceScript: string;
    topTitles?: string[];
    avgSubscribers?: number;
  } = await req.json();

  if (!keyword?.trim() || !sourceScript?.trim()) {
    return NextResponse.json({ detail: "키워드와 원본 스크립트는 필수입니다." }, { status: 400 });
  }

  try {
    const topTitlesFinal = topTitles?.length ? topTitles : [keyword];
    const pattern = analyzeTitlePatterns(topTitlesFinal);

    const { competitionLevel, competitionReason, titles } = await generateSeoTitles({
      keyword,
      topVideoTitles: topTitlesFinal,
      pattern,
      avgSubscribers,
    });

    const scriptVersions = await rewriteScript(
      sourceScript,
      keyword,
      titles.map((t) => t.title),
      titles.length
    );

    return NextResponse.json({
      generatedTitles: titles,
      generatedScripts: scriptVersions,
      competitionLevel,
      competitionReason,
      patternAnalysis: pattern,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "재구성 실패" }, { status: 400 });
  }
}
