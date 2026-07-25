import "server-only";
import { getVideoDetails } from "youtube-caption-extractor";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import type { ScriptVersion } from "@/lib/api";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

export function extractVideoId(url: string): string {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    /youtu\.be\/([^?\n]+)/,
    /youtube\.com\/shorts\/([^?\n]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return url;
}

const FILLER_WORDS = ["어", "음", "아", "에", "으", "그냥", "막", "걍", "약간", "되게"];

export function cleanKoreanScript(text: string): string {
  let cleaned = text;

  // 중복 줄 제거
  const lines = cleaned.split("\n");
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      unique.push(trimmed);
    }
  }
  cleaned = unique.join(" ");

  // 필러 단어 제거
  for (const fw of FILLER_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${fw}\\b\\s*`, "g"), "");
  }

  // 반복 어구 제거 (연속 2번 이상)
  cleaned = cleaned.replace(/(\S+)(\s+\1){2,}/g, "$1");

  // 연속 공백 정리
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

async function fetchVideoTags(videoId: string): Promise<string[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${YT_API_BASE}/videos?part=snippet&id=${videoId}&key=${key}`);
    const data = await res.json();
    return data.items?.[0]?.snippet?.tags ?? [];
  } catch {
    return [];
  }
}

export async function extractScript(videoUrl: string, lang = "ko") {
  const videoId = extractVideoId(videoUrl);
  const details = await getVideoDetails({ videoID: videoId, lang });

  if (!details.subtitles.length) {
    throw new Error("자막을 찾을 수 없습니다. 다른 영상을 선택해주세요.");
  }

  const rawScript = details.subtitles.map((s) => s.text).join(" ");
  const cleaned = cleanKoreanScript(rawScript);
  const tags = await fetchVideoTags(videoId);

  return {
    video_id: videoId,
    title: details.title,
    description: details.description,
    raw_script: rawScript.slice(0, 5000),
    cleaned_script: cleaned,
    word_count: cleaned.split(/\s+/).filter(Boolean).length,
    has_manual_subtitle: true,
    tags,
  };
}

function messageText(message: Anthropic.Message): string {
  const block = message.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

export async function lightRewriteScript(originalScript: string): Promise<string> {
  const prompt = `아래 유튜브 스크립트를 유사도 탐지를 피할 수 있도록 자연스럽게 변형해주세요.

## 원본 스크립트
${originalScript.slice(0, 4000)}

## 변형 규칙
1. 숫자/단위 표현 변경
   - 아라비아 숫자 ↔ 한글 표기 (30만원 → 삼십만 원, 3가지 → 세 가지)
   - 단위 표현 다양화 (약 30만원, 대략 삼십만 원 등)
2. 동의어 교체
   - 자주 반복되는 단어를 유사한 뜻의 단어로 교체
   - 비용→금액→가격, 진행→시공→작업, 느낌→인상→분위기 등
3. 내용·구조·흐름은 그대로 유지 (의미 절대 바꾸지 말 것)
4. 구어체 한국어 유지
5. 필러 단어(어, 음, 그냥, 막, 걍 등) 제거

스크립트 텍스트만 출력하세요.`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  return messageText(message);
}

export async function rewriteScript(
  originalScript: string,
  keyword: string,
  titles: string[],
  versionCount = 3
): Promise<ScriptVersion[]> {
  const versions: ScriptVersion[] = [];
  const n = Math.min(versionCount, titles.length || versionCount);

  for (let i = 0; i < n; i++) {
    const title = titles[i] ?? `${keyword} 관련 영상`;

    const prompt = `당신은 유튜브 콘텐츠 전문 작가입니다. 아래 원본 스크립트를 리라이팅하세요.

## 제목 (이 버전의 제목)
${title}

## 원본 스크립트
${originalScript.slice(0, 3000)}

## 리라이팅 규칙
1. 원본 내용과 핵심 메시지는 99% 동일하게 유지
2. 원본 구조(흐름)를 최대한 유지
3. 훅(도입부)이 약하면 살짝 강화, CTA가 없으면 자연스럽게 추가
4. YouTube 중복 콘텐츠 감지 회피를 위해:
   - 동의어/유사 표현으로 교체 (하지만→그러나→그런데)
   - 문장 구조 일부 변경 (능동↔수동)
   - 도입부/마무리 문구를 다르게
5. 자연스러운 구어체 한국어로 작성
6. 버전 번호: ${i + 1}번

스크립트 텍스트만 출력하세요. 제목이나 설명 없이 바로 스크립트 내용만.`;

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    versions.push({
      version_number: i + 1,
      title,
      script: messageText(message),
      channel_mapping: undefined,
    });
  }

  return versions;
}
