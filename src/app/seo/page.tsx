"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getSeoContext } from "@/lib/handoff";
import { getSearchUsage, analyzePatterns, generateTitles, generateDescription, GeneratedTitle, PatternAnalysis } from "@/lib/api";
import { saveTitle } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Copy, Bookmark, Mail } from "lucide-react";

const COMPETITION_LABEL: Record<string, { label: string; color: string }> = {
  low: { label: "🟢 낮음", color: "text-green-600" },
  medium: { label: "🟡 보통", color: "text-yellow-600" },
  high: { label: "🔴 높음", color: "text-red-600" },
};

export default function SeoPage() {
  const router = useRouter();
  const [ctx] = useState(() => getSeoContext());
  const [count, setCount] = useState(5);
  const [forcedKeyword, setForcedKeyword] = useState("");
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
  });

  const patternQuery = useQuery({
    queryKey: ["seo-pattern", ctx?.keyword],
    queryFn: () => analyzePatterns(ctx!.topTitles),
    enabled: !!ctx && usage?.plan === "paid",
  });

  const titlesMutation = useMutation({
    mutationFn: (pattern: PatternAnalysis) =>
      generateTitles(
        ctx!.keyword,
        ctx!.topTitles,
        pattern,
        forcedKeyword.trim() ? [forcedKeyword.trim()] : undefined,
        count,
        ctx!.avgSubscribers
      ),
  });

  const descMutation = useMutation({
    mutationFn: (title: string) => generateDescription(title, ctx!.keyword),
    onSuccess: (data, title) => setDescriptions((prev) => ({ ...prev, [title]: data.description })),
  });

  useEffect(() => {
    if (patternQuery.data && !titlesMutation.data && !titlesMutation.isPending) {
      titlesMutation.mutate(patternQuery.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternQuery.data]);

  if (usageLoading) return null;

  if (usage?.plan !== "paid") {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <Sparkles className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold mb-2">SEO 제목 생성</h1>
        <p className="text-gray-500 text-sm mb-6">이 기능은 유료 플랜에서 이용하실 수 있습니다.</p>
        <Button onClick={() => router.push("/billing")} className="bg-red-600 hover:bg-red-700">
          유료 플랜 시작하기
        </Button>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Sparkles className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-muted-foreground mb-6">검색 결과에서 ✨ 버튼을 눌러 제목을 생성해보세요</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          검색하러 가기
        </Button>
      </div>
    );
  }

  const competition = titlesMutation.data
    ? COMPETITION_LABEL[titlesMutation.data.competition_level] ?? COMPETITION_LABEL.medium
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">SEO 제목 생성</h1>
        <p className="text-muted-foreground text-sm mt-1">
          &quot;{ctx.keyword}&quot; 키워드 상위 노출 패턴 기반 제목 생성
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">생성 개수</span>
          <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 5, 7, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}개</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          className="w-48 h-9"
          placeholder="강제 포함 키워드 (선택)"
          value={forcedKeyword}
          onChange={(e) => setForcedKeyword(e.target.value)}
        />
        <Button
          size="sm"
          className="bg-red-600 hover:bg-red-700"
          disabled={!patternQuery.data || titlesMutation.isPending}
          onClick={() => patternQuery.data && titlesMutation.mutate(patternQuery.data)}
        >
          {titlesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "다시 생성"}
        </Button>
        {competition && (
          <Badge variant="secondary" className={`ml-auto text-xs ${competition.color}`}>
            경쟁강도 {competition.label}
          </Badge>
        )}
      </div>

      {patternQuery.data && (
        <div className="text-xs text-muted-foreground space-x-2">
          {patternQuery.data.common_patterns.map((p, i) => (
            <span key={i}>· {p}</span>
          ))}
        </div>
      )}

      {(patternQuery.isLoading || titlesMutation.isPending) && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> 제목을 생성하고 있어요...
        </div>
      )}

      {titlesMutation.isError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {(titlesMutation.error as any)?.response?.data?.detail || "제목 생성 중 오류가 발생했습니다."}
        </div>
      )}

      <div className="space-y-3">
        {titlesMutation.data?.titles.map((t: GeneratedTitle, i: number) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={t.title_type === "variation" ? "secondary" : "default"} className="text-xs">
                  {t.title_type === "variation" ? "원본변형" : "신규"}
                </Badge>
                <p className="font-medium text-sm">{t.title}</p>
              </div>
              <Badge className="shrink-0 bg-red-600">{t.seo_score}점</Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.reasons.map((r, ri) => (
                <span key={ri} className="text-xs text-muted-foreground">{r}</span>
              ))}
            </div>
            {t.tags && t.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.tags.map((tag, ti) => (
                  <Badge key={ti} variant="outline" className="text-xs">#{tag}</Badge>
                ))}
              </div>
            )}
            {descriptions[t.title] && (
              <p className="text-xs bg-gray-50 rounded p-2 whitespace-pre-wrap">{descriptions[t.title]}</p>
            )}
            <div className="flex items-center gap-1 pt-1">
              <Button variant="ghost" size="icon-sm" onClick={() => navigator.clipboard.writeText(t.title)}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => saveTitle(ctx.keyword, t)}>
                <Bookmark className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={descMutation.isPending}
                onClick={() => descMutation.mutate(t.title)}
              >
                <Mail className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
