// Stage1 검색결과 → Stage2/3 페이지로 컨텍스트를 넘길 때 쓰는 sessionStorage 핸드오프.
// (URL 쿼리로 넘기기엔 제목 목록이 길어서 sessionStorage 사용)

export interface SeoContext {
  keyword: string;
  originalTitle: string;
  topTitles: string[];
  avgSubscribers: number;
}

export interface ScriptContext {
  videoUrl: string;
  title: string;
  keyword: string;
}

const SEO_KEY = "yt_seo_context";
const SCRIPT_KEY = "yt_script_context";

export function setSeoContext(ctx: SeoContext) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SEO_KEY, JSON.stringify(ctx));
}

export function getSeoContext(): SeoContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SEO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setScriptContext(ctx: ScriptContext) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCRIPT_KEY, JSON.stringify(ctx));
}

export function getScriptContext(): ScriptContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SCRIPT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
