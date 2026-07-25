import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { generateDescription } from "@/lib/seo";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const title = req.nextUrl.searchParams.get("title") ?? "";
  const keyword = req.nextUrl.searchParams.get("keyword") ?? "";
  const footerTemplate = req.nextUrl.searchParams.get("footer_template") ?? "";

  try {
    const description = await generateDescription(title, keyword, footerTemplate);
    return NextResponse.json({ description });
  } catch (e: any) {
    return NextResponse.json({ detail: `설명란 생성 실패: ${e.message}` }, { status: 500 });
  }
}
