"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getScriptContext } from "@/lib/handoff";
import { getSearchUsage, extractScript, rewriteScript, lightRewriteScript, ScriptExtractionResponse } from "@/lib/api";
import { getSavedTitles } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Copy, Wand2 } from "lucide-react";

export default function ScriptPage() {
  const router = useRouter();
  const [ctx] = useState(() => getScriptContext());
  const [videoUrl, setVideoUrl] = useState(ctx?.videoUrl ?? "");
  const [titlesText, setTitlesText] = useState(() => {
    if (!ctx) return "";
    const saved = getSavedTitles().filter((t) => t.keyword === ctx.keyword).map((t) => t.title.title);
    return saved.join("\n");
  });
  const [versionCount, setVersionCount] = useState(3);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
  });

  const extractMutation = useMutation({
    mutationFn: (url: string) => extractScript(url),
  });

  const rewriteMutation = useMutation({
    mutationFn: (script: ScriptExtractionResponse) =>
      rewriteScript(
        script.cleaned_script,
        ctx?.keyword ?? "",
        titlesText.split("\n").map((t) => t.trim()).filter(Boolean),
        versionCount
      ),
  });

  const lightRewriteMutation = useMutation({
    mutationFn: (script: string) => lightRewriteScript(script),
  });

  if (usageLoading) return null;

  if (usage?.plan !== "paid") {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <FileText className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold mb-2">스크립트 추출 & 재구성</h1>
        <p className="text-gray-500 text-sm mb-6">이 기능은 유료 플랜에서 이용하실 수 있습니다.</p>
        <Button onClick={() => router.push("/billing")} className="bg-red-600 hover:bg-red-700">
          유료 플랜 시작하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">스크립트 추출 & 재구성</h1>
        <p className="text-muted-foreground text-sm mt-1">
          유튜브 영상 URL로 자막을 추출하고 여러 버전으로 재구성하세요
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          className="flex-1 h-10"
          placeholder="https://youtube.com/watch?v=..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <Button
          onClick={() => extractMutation.mutate(videoUrl)}
          disabled={!videoUrl.trim() || extractMutation.isPending}
          className="h-10 bg-red-600 hover:bg-red-700"
        >
          {extractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "자막 추출"}
        </Button>
      </div>

      {extractMutation.isError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {(extractMutation.error as any)?.response?.data?.detail || "자막 추출 중 오류가 발생했습니다."}
        </div>
      )}

      {extractMutation.data && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{extractMutation.data.title}</p>
              <span className="text-xs text-muted-foreground">{extractMutation.data.word_count}단어</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
              {extractMutation.data.cleaned_script}
            </p>
            <div className="flex items-center gap-1 pt-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => navigator.clipboard.writeText(extractMutation.data!.cleaned_script)}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={lightRewriteMutation.isPending}
                onClick={() => lightRewriteMutation.mutate(extractMutation.data!.cleaned_script)}
                className="gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                라이트 리라이트
              </Button>
            </div>
          </div>

          {lightRewriteMutation.data && (
            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="text-xs text-muted-foreground mb-1">라이트 리라이트 결과</p>
              <p className="text-sm whitespace-pre-wrap">{lightRewriteMutation.data.script}</p>
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">버전별 재구성 (채널마다 다른 제목으로 매핑)</p>
            <textarea
              className="w-full h-24 rounded-md border p-2 text-sm"
              placeholder={"버전별 제목을 한 줄에 하나씩 입력 (Stage2에서 저장한 제목이 있으면 자동으로 채워집니다)"}
              value={titlesText}
              onChange={(e) => setTitlesText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Select value={String(versionCount)} onValueChange={(v) => setVersionCount(Number(v))}>
                <SelectTrigger className="w-24 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 5, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}개</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                disabled={rewriteMutation.isPending || !titlesText.trim()}
                onClick={() => rewriteMutation.mutate(extractMutation.data!)}
              >
                {rewriteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "버전 생성"}
              </Button>
            </div>
          </div>

          {rewriteMutation.data && (
            <div className="space-y-3">
              {rewriteMutation.data.versions.map((v) => (
                <div key={v.version_number} className="rounded-lg border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">버전 {v.version_number}</p>
                  <p className="text-sm font-medium">{v.title}</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto">
                    {v.script}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => navigator.clipboard.writeText(v.script)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
