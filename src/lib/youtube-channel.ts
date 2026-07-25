import "server-only";
import { auth } from "@/lib/auth";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const YT_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3/videos";

export async function getFreshGoogleAccessToken(userId: string): Promise<string> {
  const result = await auth.api.getAccessToken({
    body: { providerId: "google", userId },
  });
  if (!result?.accessToken) {
    throw new Error("구글 채널이 연동되어 있지 않습니다. 채널을 먼저 연결해주세요.");
  }
  return result.accessToken;
}

export async function listMyChannels(accessToken: string) {
  const res = await fetch(`${YT_API_BASE}/channels?part=snippet,statistics&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data: {
    error?: { message?: string };
    items?: Array<{
      id: string;
      snippet: { title: string; thumbnails?: { default?: { url?: string } } };
      statistics?: { subscriberCount?: string };
    }>;
  } = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "채널 조회 실패");
  }
  return (data.items ?? []).map((item) => ({
    channelId: item.id,
    channelName: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url,
    subscriberCount: Number(item.statistics?.subscriberCount ?? 0),
  }));
}

export async function openResumableUploadSession(params: {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus?: "public" | "unlisted" | "private";
  fileSizeBytes: number;
  fileMimeType: string;
}): Promise<string> {
  const { accessToken, title, description, tags, privacyStatus = "public", fileSizeBytes, fileMimeType } = params;

  const res = await fetch(`${YT_UPLOAD_BASE}?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(fileSizeBytes),
      "X-Upload-Content-Type": fileMimeType,
    },
    body: JSON.stringify({
      snippet: { title, description, tags },
      status: { privacyStatus },
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `업로드 세션 생성 실패 (${res.status})`);
  }

  const location = res.headers.get("location");
  if (!location) throw new Error("업로드 URL을 받지 못했습니다.");
  return location;
}
