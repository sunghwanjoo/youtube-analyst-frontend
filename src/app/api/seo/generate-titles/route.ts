import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { generateSeoTitles } from "@/lib/seo";
import type { PatternAnalysis } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const avgSubscribers = Number(req.nextUrl.searchParams.get("avg_subscribers") ?? "0");
  const body = await req.json();
  const {
    keyword,
    top_video_titles,
    pattern_analysis,
    forced_keywords,
    count = 5,
  }: {
    keyword: string;
    top_video_titles: string[];
    pattern_analysis: PatternAnalysis;
    forced_keywords?: string[];
    count?: number;
  } = body;

  try {
    const { competitionLevel, competitionReason, titles } = await generateSeoTitles({
      keyword,
      topVideoTitles: top_video_titles,
      pattern: pattern_analysis,
      forcedKeywords: forced_keywords,
      count,
      avgSubscribers,
    });

    return NextResponse.json({
      keyword,
      pattern_analysis,
      competition_level: competitionLevel,
      competition_reason: competitionReason,
      titles,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: `제목 생성 실패: ${e.message}` }, { status: 500 });
  }
}
