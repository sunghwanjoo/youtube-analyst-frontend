import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { rewriteScript } from "@/lib/script";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const { original_script, keyword, titles, version_count } = await req.json();

  try {
    const versions = await rewriteScript(original_script, keyword, titles ?? [], version_count ?? 3);
    return NextResponse.json({ versions });
  } catch (e: any) {
    return NextResponse.json({ detail: `재구성 실패: ${e.message}` }, { status: 500 });
  }
}
