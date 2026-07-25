import { NextRequest, NextResponse } from "next/server";
import { requirePaidPlan } from "@/lib/session";
import { lightRewriteScript } from "@/lib/script";

export async function POST(req: NextRequest) {
  const { response } = await requirePaidPlan();
  if (response) return response;

  const { original_script } = await req.json();

  try {
    const script = await lightRewriteScript(original_script);
    return NextResponse.json({ script });
  } catch (e: any) {
    return NextResponse.json({ detail: `변형 실패: ${e.message}` }, { status: 500 });
  }
}
