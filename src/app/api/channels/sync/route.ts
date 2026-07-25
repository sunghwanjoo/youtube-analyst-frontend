import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requirePaidPlan } from "@/lib/session";
import { getFreshGoogleAccessToken, listMyChannels } from "@/lib/youtube-channel";
import { db } from "@/db";
import { connectedChannels } from "@/db/schema";

export async function POST() {
  const { session, response } = await requirePaidPlan();
  if (response) return response;

  try {
    const accessToken = await getFreshGoogleAccessToken(session!.user.id);
    const channels = await listMyChannels(accessToken);

    for (const ch of channels) {
      await db
        .insert(connectedChannels)
        .values({
          id: randomUUID(),
          userId: session!.user.id,
          channelId: ch.channelId,
          channelName: ch.channelName,
          thumbnailUrl: ch.thumbnailUrl,
        })
        .onConflictDoUpdate({
          target: [connectedChannels.userId, connectedChannels.channelId],
          set: { channelName: ch.channelName, thumbnailUrl: ch.thumbnailUrl },
        });
    }

    return NextResponse.json({ ok: true, count: channels.length });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "채널 연동 실패" }, { status: 400 });
  }
}
