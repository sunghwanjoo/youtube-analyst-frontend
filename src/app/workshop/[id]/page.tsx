"use client";
import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSearchUsage, getWorkshopItem, updateWorkshopItem } from "@/lib/api";
import { WorkshopEditor, WorkshopEditableData } from "@/components/workshop/WorkshopEditor";
import { Button } from "@/components/ui/button";
import { Package, Loader2, ArrowLeft } from "lucide-react";

export default function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
  });

  const itemQuery = useQuery({
    queryKey: ["workshop-item", id],
    queryFn: () => getWorkshopItem(id),
    enabled: usage?.plan === "paid",
  });

  const saveMutation = useMutation({
    mutationFn: (data: WorkshopEditableData) =>
      updateWorkshopItem(id, {
        keyword: data.keyword,
        sourceTitle: data.sourceTitle,
        sourceDescription: data.sourceDescription,
        sourceScript: data.sourceScript,
        generatedTitles: data.generatedTitles,
        generatedScripts: data.generatedScripts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshop-item", id] });
      queryClient.invalidateQueries({ queryKey: ["workshop-items"] });
    },
  });

  if (usageLoading || itemQuery.isLoading) return null;

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

  if (!itemQuery.data) {
    return <div className="py-20 text-center text-muted-foreground">항목을 찾을 수 없습니다.</div>;
  }

  const item = itemQuery.data;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/workshop" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{item.keyword}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date(item.createdAt).toLocaleString("ko-KR")}에 생성됨
        </p>
      </div>

      <WorkshopEditor
        data={{
          keyword: item.keyword,
          sourceTitle: item.sourceTitle,
          sourceDescription: item.sourceDescription,
          sourceThumbnailUrl: item.sourceThumbnailUrl,
          sourceScript: item.sourceScript,
          generatedTitles: item.generatedTitles,
          generatedScripts: item.generatedScripts,
        }}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
        saveLabel={saveMutation.isSuccess ? "저장됨" : "수정사항 저장"}
      />
      {saveMutation.isPending ? null : saveMutation.isSuccess ? (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Loader2 className="w-3 h-3 hidden" /> 저장되었습니다
        </p>
      ) : null}
    </div>
  );
}
