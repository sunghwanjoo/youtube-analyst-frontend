"use client";
import { useState, useEffect } from "react";
import { VideoResult } from "@/lib/api";
import { getFavorites, removeFavorite } from "@/lib/store";
import { VideoTable } from "@/components/search/VideoTable";
import { Button } from "@/components/ui/button";
import { Heart, Trash2 } from "lucide-react";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<VideoResult[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const clearAll = () => {
    favorites.forEach((v) => removeFavorite(v.video_id));
    setFavorites([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            관심영상
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            저장한 영상 {favorites.length}개
          </p>
        </div>
        {favorites.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            전체 삭제
          </Button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Heart className="w-12 h-12 mb-4 opacity-20" />
          <p>저장된 관심영상이 없습니다</p>
          <p className="text-xs mt-1">검색 결과에서 ♥ 버튼을 눌러 저장해보세요</p>
        </div>
      ) : (
        <VideoTable videos={favorites} keyword="" />
      )}
    </div>
  );
}
