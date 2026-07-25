"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getWorkshopContext } from "@/lib/handoff";
import { extractYoutubeVideoId } from "@/lib/utils";
import { getSearchUsage, extractForWorkshop, createWorkshopItem } from "@/lib/api";
import { WorkshopEditor, WorkshopEditableData } from "@/components/workshop/WorkshopEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Loader2 } from "lucide-react";

export default function WorkshopNewPage() {
  const router = useRouter();
  const [ctx] = useState(() => getWorkshopContext());
  const [videoUrl, setVideoUrl] = useState("");
  const [keyword, setKeyword] = useState(ctx?.keyword ?? "");

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      const videoId = ctx?.videoId ?? extractYoutubeVideoId(videoUrl);
      if (!videoId) throw new Error("영상 URL이 올바르지 않습니다.");
      if (!keyword.trim()) throw new Error("키워드를 입력해주세요.");
      return extractForWorkshop({
        videoId,
        keyword: keyword.trim(),
        topTitles: ctx?.topTitles,
        avgSubscribers: ctx?.avgSubscribers,
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: WorkshopEditableData) =>
      createWorkshopItem({
        keyword: data.keyword,
        sourceVideoId: extractMutation.data!.sourceVideoId,
        sourceTitle: data.sourceTitle,
        sourceDescription: data.sourceDescription,
        sourceThumbnailUrl: data.sourceThumbnailUrl,
        sourceScript: data.sourceScript,
        generatedTitles: data.generatedTitles,
        generatedScripts: data.generatedScripts,
      }),
    onSuccess: (item) => router.push(`/workshop/${item.id}`),
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
      <div>
        <h1 className="text-2xl font-bold">제작소 — 새로 만들기</h1>
        <p className="text-muted-foreground text-sm mt-1">
          영상 하나로 제목/설명/썸네일/스크립트를 뽑고, 재구성까지 한 번에
        </p>
      </div>

      {!extractMutation.data && (
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
            disabled={extractMutation.isPending || !keyword.trim() || (!ctx && !videoUrl.trim())}
            className="bg-red-600 hover:bg-red-700"
          >
            {extractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "추출하기"}
          </Button>
          {extractMutation.isError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {(extractMutation.error as any)?.response?.data?.detail || (extractMutation.error as Error).message}
            </div>
          )}
        </div>
      )}

      {extractMutation.data && (
        <WorkshopEditor
          data={{
            keyword: extractMutation.data.keyword,
            sourceTitle: extractMutation.data.sourceTitle,
            sourceDescription: extractMutation.data.sourceDescription,
            sourceThumbnailUrl: extractMutation.data.sourceThumbnailUrl,
            sourceScript: extractMutation.data.sourceScript,
            generatedTitles: extractMutation.data.generatedTitles,
            generatedScripts: extractMutation.data.generatedScripts,
          }}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
          saveLabel="제작소에 저장"
        />
      )}
    </div>
  );
}
