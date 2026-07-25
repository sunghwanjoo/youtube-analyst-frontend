import { NextResponse } from "next/server";
import { getServerSession, getUserPlan } from "@/lib/session";
import { checkSearchLimit, FREE_DAILY_SEARCH_LIMIT } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }

  const plan = await getUserPlan(session.user.id);
  const { remaining } = await checkSearchLimit(session.user.id, plan);

  return NextResponse.json({
    loggedIn: true,
    plan,
    remaining, // paid는 null(무제한)
    limit: FREE_DAILY_SEARCH_LIMIT,
  });
}
