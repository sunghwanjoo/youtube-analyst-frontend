"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getWorkshopContext } from "@/lib/handoff";
import { extractYoutubeVideoId } from "@/lib/utils";
import {
  getSearchUsage,
  extractWorkshopSource,
  regenerateWorkshopContent,
  createWorkshopItem,
  WorkshopExtractResponse,
} from "@/lib/api";
import { WorkshopEditor, WorkshopEditableData } from "@/components/workshop/WorkshopEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Loader2, Wand2, Save, ArrowLeft } from "lucide-react";

export default function WorkshopNewPage() {
  const router = useRouter();
  const [ctx] = useState(() => getWorkshopContext());
  const [videoUrl, setVideoUrl] = useState("");
  const [keyword, setKeyword] = useState(ctx?.keyword ?? "");
  const [source, setSource] = useState<WorkshopExtractResponse | null>(null);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      const videoId = ctx?.videoId ?? extractYoutubeVideoId(videoUrl);
      if (!videoId) throw new Error("영상 URL이 올바르지 않습니다.");
      return extractWorkshopSource(videoId);
    },
    onSuccess: (data) => setSource(data),
  });

  const regenerateMutation = useMutation({
    mutationFn: () =>
      regenerateWorkshopContent({
        keyword: keyword.trim(),
        sourceScript: source!.sourceScript,
        topTitles: ctx?.topTitles,
        avgSubscribers: ctx?.avgSubscribers,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (data: WorkshopEditableData) =>
      createWorkshopItem({
        keyword: data.keyword,
        sourceVideoId: source!.sourceVideoId,
        sourceTitle: data.sourceTitle,
        sourceDescription: data.sourceDescription,
        sourceThumbnailUrl: data.sourceThumbnailUrl,
        sourceScript: data.sourceScript,
        generatedTitles: data.generatedTitles,
        generatedScripts: data.generatedScripts,
      }),
    onSuccess: () => router.push("/workshop"),
  });

  const saveSourceOnlyMutation = useMutation({
    mutationFn: () =>
      createWorkshopItem({
        keyword: keyword.trim(),
        sourceVideoId: source!.sourceVideoId,
        sourceTitle: source!.sourceTitle,
        sourceDescription: source!.sourceDescription,
        sourceThumbnailUrl: source!.sourceThumbnailUrl,
        sourceScript: source!.sourceScript,
        generatedTitles: [],
        generatedScripts: [],
      }),
    onSuccess: () => router.push("/workshop"),
  });

  if (usageLoading) return null;

  if (usage?.plan !== "paid") {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <Package className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold mb-2">제작소</h1>
        <p className="text-gray-500 text-sm mb-6">이 기능은 유료 플랜에서 이용하실 수 있습니다.</p>
        <Button onClick={() => router.push("/billing")} className="bg-red-600 hover:bg-red-700">
          유료 플랜 시작하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/workshop" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>
      <div>
        <h1 className="text-2xl font-bold">제작소 — 새로 만들기</h1>
        <p className="text-muted-foreground text-sm mt-1">
          영상 하나로 제목/설명/썸네일/스크립트를 뽑고, 재구성까지
        </p>
      </div>

      {/* 1단계: 원본 추출 */}
      {!source && (
        <div className="rounded-lg border p-4 space-y-3">
          {ctx ? (
            <div className="flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ctx.thumbnailUrl} alt="" className="w-24 h-16 object-cover rounded" />
              <p className="text-sm font-medium">{ctx.title}</p>
            </div>
          ) : (
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="h-10"
            />
          )}
          <Input
            placeholder="키워드"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-10"
          />
          <Button
            onClick={() => extractMutation.mutate()}
            disabled={extractMutation.isPending || (!ctx && !videoUrl.trim())}
            className="bg-red-600 hover:bg-red-700"
          >
            {extractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "추출하기"}
          </Button>
          {extractMutation.isError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {(extractMutation.error as any)?.response?.data?.detail || (extractMutation.error as Error).message}
              <p className="mt-1 text-xs">
                유튜브 쪽 일시적인 차단일 수 있어요 — 잠시 후 다시 시도해보세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2단계: 원본 확인/수정 + 재구성 트리거 */}
      {source && !regenerateMutation.data && (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">원본 영상 (확인 후 재구성하세요)</p>
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={source.sourceThumbnailUrl} alt="" className="w-32 h-20 object-cover rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Input
                value={source.sourceTitle}
                onChange={(e) => setSource({ ...source, sourceTitle: e.target.value })}
                className="h-8 text-sm font-medium"
              />
              <textarea
                className="w-full h-16 rounded-md border p-2 text-xs text-muted-foreground"
                value={source.sourceDescription}
                onChange={(e) => setSource({ ...source, sourceDescription: e.target.value })}
              />
            </div>
          </div>
          <textarea
            className="w-full h-32 rounded-md border p-2 text-sm"
            value={source.sourceScript}
            onChange={(e) => setSource({ ...source, sourceScript: e.target.value })}
          />
          <Input
            placeholder="키워드"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-9"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending || !keyword.trim()}
              className="bg-red-600 hover:bg-red-700 gap-1.5"
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              제목/스크립트 재구성하기
            </Button>
            <Button
              variant="outline"
              onClick={() => saveSourceOnlyMutation.mutate()}
              disabled={saveSourceOnlyMutation.isPending || !keyword.trim()}
              className="gap-1.5"
            >
              {saveSourceOnlyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              재구성 없이 저장
            </Button>
          </div>
          {regenerateMutation.isError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {(regenerateMutation.error as any)?.response?.data?.detail || (regenerateMutation.error as Error).message}
            </div>
          )}
        </div>
      )}

      {/* 3단계: 재구성 결과 편집 + 저장 */}
      {source && regenerateMutation.data && (
        <WorkshopEditor
          data={{
            keyword,
            sourceTitle: source.sourceTitle,
            sourceDescription: source.sourceDescription,
            sourceThumbnailUrl: source.sourceThumbnailUrl,
            sourceScript: source.sourceScript,
            generatedTitles: regenerateMutation.data.generatedTitles,
            generatedScripts: regenerateMutation.data.generatedScripts,
          }}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
          saveLabel="제작소에 저장"
        />
      )}
    </div>
  );
}
