import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userPlan } from "@/db/schema";

/**
 * Route Handler/Server Component에서 매번 직접 호출해서 검증할 것.
 * proxy.ts의 낙관적 리다이렉트만 믿지 말 것 (Next.js 16 권장 패턴).
 */
export async function getServerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function getUserPlan(userId: string): Promise<"free" | "paid"> {
  const [row] = await db
    .select({ plan: userPlan.plan, role: userPlan.role })
    .from(userPlan)
    .where(eq(userPlan.userId, userId))
    .limit(1);

  if (row) return row.role === "admin" ? "paid" : row.plan;

  await db.insert(userPlan).values({ userId, plan: "free" }).onConflictDoNothing();
  return "free";
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    return { session: null, response: Response.json({ detail: "로그인이 필요합니다." }, { status: 401 }) };
  }
  return { session, response: null };
}

export async function requirePaidPlan() {
  const session = await getServerSession();
  if (!session) {
    return { session: null, response: Response.json({ detail: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const plan = await getUserPlan(session.user.id);
  if (plan !== "paid") {
    return { session, response: Response.json({ detail: "유료 플랜 전용 기능입니다." }, { status: 402 }) };
  }
  return { session, response: null };
}
