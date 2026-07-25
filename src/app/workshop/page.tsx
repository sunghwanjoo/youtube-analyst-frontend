"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSearchUsage, getWorkshopItems, deleteWorkshopItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Trash2 } from "lucide-react";

export default function WorkshopListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
  });

  const itemsQuery = useQuery({
    queryKey: ["workshop-items"],
    queryFn: getWorkshopItems,
    enabled: usage?.plan === "paid",
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkshopItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workshop-items"] }),
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

  const items = itemsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">제작소</h1>
          <p className="text-muted-foreground text-sm mt-1">
            추출하고 재구성한 제목/스크립트 세트 모음
          </p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 gap-1.5" onClick={() => router.push("/workshop/new")}>
          <Plus className="w-4 h-4" />
          새로 만들기
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mb-4 opacity-20" />
          <p>검색결과에서 &quot;제작소로 만들기&quot;를 눌러 시작해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border overflow-hidden group">
              <Link href={`/workshop/${item.id}`} className="block">
                {item.sourceThumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.sourceThumbnailUrl} alt="" className="w-full h-32 object-cover" />
                )}
                <div className="p-3 space-y-1.5">
                  <Badge variant="secondary" className="text-xs">{item.keyword}</Badge>
                  <p className="text-sm font-medium line-clamp-2">{item.sourceTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    버전 {item.generatedTitles.length}개 · {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </Link>
              <div className="px-3 pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground gap-1.5"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
