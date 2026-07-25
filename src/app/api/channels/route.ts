import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requirePaidPlan } from "@/lib/session";
import { db } from "@/db";
import { connectedChannels } from "@/db/schema";

export async function GET() {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  const channels = await db
    .select()
    .from(connectedChannels)
    .where(eq(connectedChannels.userId, session!.user.id));

  return NextResponse.json({ channels });
}
