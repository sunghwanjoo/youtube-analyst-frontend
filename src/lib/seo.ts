import "server-only";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import type { PatternAnalysis, GeneratedTitle } from "@/lib/api";

const POWER_WORDS = [
  "무료", "공짜", "비밀", "충격", "실제", "완벽", "최초", "최고", "역대",
  "진짜", "솔직", "현실", "폭로", "대박", "실화", "레전드", "미쳤다",
  "반드시", "꼭", "필수", "주의", "경고", "긴급", "속보", "단독",
];

const QUESTION_PATTERNS = ["?", "어떻게", "왜", "뭐가", "무엇이", "어디서", "언제"];

export function analyzeTitlePatterns(titles: string[]): PatternAnalysis {
  if (!titles.length) {
    return { has_number_ratio: 0, is_question_ratio: 0, avg_length: 0, power_words: [], common_patterns: [], top_titles: [] };
  }

  const total = titles.length;
  const hasNumber = titles.filter((t) => /\d/.test(t)).length;
  const numberRatio = Math.round((hasNumber / total) * 100) / 100;

  const isQuestion = titles.filter((t) => QUESTION_PATTERNS.some((p) => t.includes(p))).length;
  const questionRatio = Math.round((isQuestion / total) * 100) / 100;

  const avgLen = Math.round((titles.reduce((sum, t) => sum + t.length, 0) / total) * 10) / 10;

  const foundPower: string[] = [];
  for (const word of POWER_WORDS) {
    const count = titles.filter((t) => t.includes(word)).length;
    if (count > 0) foundPower.push(`${word}(${count}개)`);
  }

  const patterns: string[] = [];
  if (numberRatio >= 0.5) patterns.push(`상위 ${Math.round(numberRatio * 100)}%가 숫자 포함`);
  if (questionRatio >= 0.3) patterns.push(`상위 ${Math.round(questionRatio * 100)}%가 의문형`);
  const bracketCount = titles.filter((t) => t.includes("[") || t.includes("【")).length;
  if (bracketCount > 0) patterns.push(`${bracketCount}개 제목이 대괄호 사용`);
  if (avgLen < 40) patterns.push(`평균 제목 길이 ${avgLen}자 (짧은 편)`);
  else if (avgLen > 55) patterns.push(`평균 제목 길이 ${avgLen}자 (긴 편)`);
  else patterns.push(`평균 제목 길이 ${avgLen}자`);

  return {
    has_number_ratio: numberRatio,
    is_question_ratio: questionRatio,
    avg_length: avgLen,
    power_words: foundPower.slice(0, 5),
    common_patterns: patterns,
    top_titles: titles.slice(0, 10),
  };
}

export function calcCompetitionLevel(avgSubscribers: number): { level: string; reason: string } {
  if (avgSubscribers < 100_000) {
    return { level: "low", reason: `상위권 채널 평균 구독자 ${avgSubscribers.toLocaleString()}명 — 공략 가능` };
  } else if (avgSubscribers < 1_000_000) {
    return { level: "medium", reason: `상위권 채널 평균 구독자 ${avgSubscribers.toLocaleString()}명 — 경쟁 있음` };
  }
  return { level: "high", reason: `상위권 채널 평균 구독자 ${avgSubscribers.toLocaleString()}명 — 레드오션` };
}

export function calcSeoScore(
  title: string,
  keyword: string,
  pattern: PatternAnalysis,
  forcedKeywords?: string[]
): { score: number; breakdown: Record<string, number>; reasons: string[] } {
  let score = 0;
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  if (title.toLowerCase().includes(keyword.toLowerCase())) {
    score += 20;
    breakdown.keyword_include = 20;
    reasons.push(`✅ 키워드 '${keyword}' 포함`);
  } else {
    breakdown.keyword_include = 0;
    reasons.push(`❌ 키워드 '${keyword}' 미포함`);
  }

  const words = title.split(/\s+/);
  const first3 = words.slice(0, 3).join(" ");
  if (first3.toLowerCase().includes(keyword.toLowerCase())) {
    score += 15;
    breakdown.keyword_position = 15;
    reasons.push("✅ 키워드가 제목 앞부분에 위치");
  } else {
    breakdown.keyword_position = 0;
    reasons.push("⚠️ 키워드를 제목 앞부분에 배치하면 더 좋음");
  }

  const length = title.length;
  if (length >= 30 && length <= 60) {
    score += 10;
    breakdown.length = 10;
    reasons.push(`✅ 제목 길이 최적 (${length}자)`);
  } else if (length < 30) {
    score += 5;
    breakdown.length = 5;
    reasons.push(`⚠️ 제목이 짧음 (${length}자, 30~60자 권장)`);
  } else {
    score += 3;
    breakdown.length = 3;
    reasons.push(`⚠️ 제목이 너무 김 (${length}자, 60자 이하 권장)`);
  }

  if (/\d/.test(title)) {
    score += 10;
    breakdown.has_number = 10;
    reasons.push("✅ 숫자 포함 (CTR 상승 효과)");
  } else {
    breakdown.has_number = 0;
    reasons.push("💡 숫자 추가 시 CTR 상승 가능");
  }

  const foundPower = POWER_WORDS.filter((w) => title.includes(w));
  if (foundPower.length) {
    score += 10;
    breakdown.power_words = 10;
    reasons.push(`✅ 파워워드 포함: ${foundPower.join(", ")}`);
  } else {
    breakdown.power_words = 0;
    reasons.push("💡 파워워드 추가 시 클릭 유도 가능");
  }

  if (QUESTION_PATTERNS.some((p) => title.includes(p))) {
    score += 10;
    breakdown.curiosity = 10;
    reasons.push("✅ 호기심 유발 구조");
  } else {
    breakdown.curiosity = 0;
  }

  let patternScore = 0;
  if (pattern.has_number_ratio >= 0.5 && /\d/.test(title)) patternScore += 10;
  if (pattern.is_question_ratio >= 0.3 && QUESTION_PATTERNS.some((p) => title.includes(p))) patternScore += 10;
  score += patternScore;
  breakdown.pattern_match = patternScore;
  if (patternScore > 0) reasons.push(`✅ 상위 노출 패턴 ${patternScore / 10}개 일치`);

  if (forcedKeywords && forcedKeywords.length) {
    if (forcedKeywords.every((kw) => title.includes(kw))) {
      score += 5;
      breakdown.forced_keywords = 5;
      reasons.push("✅ 지정 키워드 모두 포함");
    } else {
      breakdown.forced_keywords = 0;
    }
  } else {
    breakdown.forced_keywords = 5;
    score += 5;
  }

  return { score: Math.min(score, 100), breakdown, reasons };
}

export function generateTags(title: string, keyword: string): string[] {
  const tags = [keyword];
  for (const word of POWER_WORDS) {
    if (title.includes(word) && !tags.includes(word)) tags.push(word);
  }
  const numbers = title.match(/\d+/g) ?? [];
  for (const n of numbers.slice(0, 2)) tags.push(n);
  const words = title.match(/[가-힣]{2,}/g) ?? [];
  for (const w of words.slice(0, 5)) {
    if (!tags.includes(w) && w !== keyword) tags.push(w);
  }
  return Array.from(new Set(tags)).slice(0, 15);
}

function extractJson(raw: string): string {
  return raw.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
}

export async function generateSeoTitles(params: {
  keyword: string;
  topVideoTitles: string[];
  pattern: PatternAnalysis;
  forcedKeywords?: string[];
  count?: number;
  avgSubscribers?: number;
}): Promise<{ competitionLevel: string; competitionReason: string; titles: GeneratedTitle[] }> {
  const { keyword, topVideoTitles, pattern, forcedKeywords, count = 5, avgSubscribers = 0 } = params;
  const { level: competitionLevel, reason: competitionReason } = calcCompetitionLevel(avgSubscribers);

  const forcedKwStr = forcedKeywords?.length ? `\n- 반드시 포함할 키워드: ${forcedKeywords.join(", ")}` : "";
  const originalTitle = topVideoTitles[0] ?? "";
  const newCount = Math.max(1, count - 2);

  const prompt = `당신은 유튜브 SEO 전문가입니다. 아래 지침에 따라 제목을 생성하세요.

## 검색 키워드
${keyword}

## 원본 영상 제목 (변형 대상)
${originalTitle}

## 상위 노출 영상 참고 제목
${topVideoTitles.slice(1, 10).map((t) => `- ${t}`).join("\n")}

## 패턴 분석 결과
- 숫자 포함 비율: ${Math.round(pattern.has_number_ratio * 100)}%
- 의문형 비율: ${Math.round(pattern.is_question_ratio * 100)}%
- 평균 제목 길이: ${pattern.avg_length}자
- 자주 쓰인 파워워드: ${pattern.power_words.length ? pattern.power_words.slice(0, 5).join(", ") : "없음"}
${forcedKwStr}

## 생성 규칙
### [variation] 원본변형 2개
- 원본 제목의 의미와 구조를 유지하되 표현만 살짝 바꿀 것
- 유사제목 필터에 걸리지 않을 정도로만 변형 (단어 교체, 어순 변경, 동의어 활용)
- 원본과 내용이 동일하게 느껴져야 함

### [new] 신규제목 ${newCount}개
- 원본과 무관하게 키워드 + 상위 패턴을 분석해 완전히 새로운 제목 생성
- 키워드를 제목 앞부분(첫 3단어 안)에 배치
- 30~60자 사이, 서로 다른 구조 (숫자형/의문형/감성형/충격형/정보형)
- 한국 유튜브 시청자 클릭 심리 극대화

## 출력 형식 (JSON 배열, 총 ${count}개 — variation 2개 먼저, new ${newCount}개)
[
  {"title": "원본변형 제목1", "type": "variation"},
  {"title": "원본변형 제목2", "type": "variation"},
  {"title": "신규 제목1", "type": "new"}
]

JSON만 출력하고 다른 텍스트는 쓰지 마세요.`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const titleList: Array<{ title: string; type?: string }> = JSON.parse(extractJson(raw));

  const generated: GeneratedTitle[] = titleList.slice(0, count).map((item) => {
    const { score, breakdown, reasons } = calcSeoScore(item.title, keyword, pattern, forcedKeywords);
    return {
      title: item.title,
      seo_score: score,
      score_breakdown: breakdown,
      reasons,
      tags: generateTags(item.title, keyword),
      title_type: item.type ?? "new",
    };
  });

  generated.sort((a, b) => {
    const typeOrder = (t?: string) => (t === "variation" ? 0 : 1);
    const typeDiff = typeOrder(a.title_type) - typeOrder(b.title_type);
    return typeDiff !== 0 ? typeDiff : b.seo_score - a.seo_score;
  });

  return { competitionLevel, competitionReason, titles: generated };
}

export async function generateDescription(title: string, keyword: string, footerTemplate = ""): Promise<string> {
  const prompt = `유튜브 영상 SEO 설명란을 작성하세요.

영상 제목: ${title}
핵심 키워드: ${keyword}

## 규칙
1. 첫 2줄에 반드시 '${keyword}' 키워드 포함 (검색 결과 미리보기에 노출)
2. 관련 키워드를 자연스럽게 포함
3. 해시태그 3~5개를 하단에 추가 (#${keyword} 포함)
4. 전체 200~400자 분량
5. 친근하고 자연스러운 한국어로 작성

JSON 없이 설명란 텍스트만 출력하세요.`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  return footerTemplate ? `${footerTemplate}\n\n────────────────\n${text}` : text;
}
