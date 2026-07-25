// Stage1 검색결과 → 제작소(새로 만들기)로 컨텍스트를 넘길 때 쓰는 sessionStorage 핸드오프.
// (URL 쿼리로 넘기기엔 제목 목록이 길어서 sessionStorage 사용)

export interface WorkshopContext {
  videoId: string;
  keyword: string;
  title: string;
  thumbnailUrl: string;
  topTitles: string[];
  avgSubscribers: number;
}

const WORKSHOP_KEY = "yt_workshop_context";

export function setWorkshopContext(ctx: WorkshopContext) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WORKSHOP_KEY, JSON.stringify(ctx));
}

export function getWorkshopContext(): WorkshopContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WORKSHOP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
