import "server-only";
import { sql, eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { searchUsage } from "@/db/schema";

export const FREE_DAILY_SEARCH_LIMIT = 5;

function todayKST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export async function checkSearchLimit(
  userId: string,
  plan: "free" | "paid"
): Promise<{ allowed: boolean; remaining: number | null }> {
  if (plan === "paid") return { allowed: true, remaining: null };

  const usageDate = todayKST();
  const [row] = await db
    .select({ count: searchUsage.count })
    .from(searchUsage)
    .where(and(eq(searchUsage.userId, userId), eq(searchUsage.usageDate, usageDate)))
    .limit(1);

  const current = row?.count ?? 0;
  if (current >= FREE_DAILY_SEARCH_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: FREE_DAILY_SEARCH_LIMIT - current };
}

export async function incrementSearchUsage(userId: string): Promise<void> {
  const usageDate = todayKST();
  await db
    .insert(searchUsage)
    .values({ id: randomUUID(), userId, usageDate, count: 1 })
    .onConflictDoUpdate({
      target: [searchUsage.userId, searchUsage.usageDate],
      set: { count: sql`${searchUsage.count} + 1` },
    });
}
