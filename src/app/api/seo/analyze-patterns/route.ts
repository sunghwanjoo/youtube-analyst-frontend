import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { analyzeTitlePatterns } from "@/lib/seo";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const titles: string[] = await req.json();
  return NextResponse.json(analyzeTitlePatterns(titles));
}
