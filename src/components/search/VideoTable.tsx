"use client";
import { useState } from "react";
import Image from "next/image";
import { VideoResult } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Heart,
  Sparkles,
  FileText,
  ArrowUp,
  ArrowDown,
  HelpCircle,
} from "lucide-react";
import { ScoreModal } from "./ScoreModal";
import { PaywallModal } from "@/components/PaywallModal";
import { addFavorite, isFavorite, removeFavorite } from "@/lib/store";

type SortKey =
  | "viral_score"
  | "long_run_score"
  | "view_count"
  | "subscriber_count"
  | "published_at"
  | "duration_seconds"
  | "like_count"
  | "comment_count";

interface Props {
  videos: VideoResult[];
  keyword: string;
}

function fmt(n?: number | null): string {
  if (n == null) return "-";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천`;
  return n.toLocaleString();
}

export function VideoTable({ videos, keyword }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("viral_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [scoreModal, setScoreModal] = useState<"viral" | "longrun" | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(
    () => new Set(videos.filter((v) => isFavorite(v.video_id)).map((v) => v.video_id))
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...videos].sort((a, b) => {
    const av = (a as any)[sortKey] ?? 0;
    const bv = (b as any)[sortKey] ?? 0;
    const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "desc" ? (
        <ArrowDown className="w-3 h-3 inline ml-1" />
      ) : (
        <ArrowUp className="w-3 h-3 inline ml-1" />
      )
    ) : null;

  const toggleFav = (video: VideoResult) => {
    const next = new Set(favs);
    if (favs.has(video.video_id)) {
      removeFavorite(video.video_id);
      next.delete(video.video_id);
    } else {
      addFavorite(video);
      next.add(video.video_id);
    }
    setFavs(next);
  };

  const competitionColor = (score?: number | null) => {
    if (!score) return "text-gray-400";
    if (score >= 10) return "text-red-600 font-bold";
    if (score >= 3) return "text-orange-500 font-semibold";
    return "text-green-600";
  };

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-16">썸네일</TableHead>
              <TableHead className="min-w-[200px] max-w-[280px]">제목</TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("subscriber_count")}>
                구독자 <SortIcon col="subscriber_count" />
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("view_count")}>
                조회수 <SortIcon col="view_count" />
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("viral_score")}>
                <span className="flex items-center gap-1">
                  떡상지수 <SortIcon col="viral_score" />
                  <button onClick={(e) => { e.stopPropagation(); setScoreModal("viral"); }}>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </span>
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("long_run_score")}>
                <span className="flex items-center gap-1">
                  롱런지수 <SortIcon col="long_run_score" />
                  <button onClick={(e) => { e.stopPropagation(); setScoreModal("longrun"); }}>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </span>
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("published_at")}>
                업로드일 <SortIcon col="published_at" />
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("duration_seconds")}>
                길이 <SortIcon col="duration_seconds" />
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("like_count")}>
                좋아요 <SortIcon col="like_count" />
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("comment_count")}>
                댓글 <SortIcon col="comment_count" />
              </TableHead>
              <TableHead className="text-center">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((v) => (
              <TableRow key={v.video_id} className="hover:bg-gray-50">
                <TableCell>
                  <a
                    href={`https://youtube.com/watch?v=${v.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={v.thumbnail_url}
                      alt={v.title}
                      className="w-16 h-10 object-cover rounded"
                    />
                  </a>
                </TableCell>
                <TableCell className="whitespace-normal max-w-[280px]">
                  <div className="space-y-0.5">
                    <a
                      href={`https://youtube.com/watch?v=${v.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-red-600 line-clamp-2 leading-tight"
                    >
                      {v.title}
                    </a>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{v.channel_name}</span>
                      {v.is_short && <Badge variant="secondary" className="text-xs py-0 px-1.5">Shorts</Badge>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{fmt(v.subscriber_count)}</TableCell>
                <TableCell className="text-sm">{fmt(v.view_count)}</TableCell>
                <TableCell>
                  <span className={`text-sm ${competitionColor(v.viral_score)}`}>
                    {v.viral_score?.toFixed(2) ?? "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-blue-600">
                    {v.long_run_score?.toFixed(2) ?? "-"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(v.published_at).toLocaleDateString("ko-KR")}
                  <br />
                  <span className="text-xs">({v.days_since_upload}일 전)</span>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">{v.duration_label}</TableCell>
                <TableCell className="text-sm">{fmt(v.like_count)}</TableCell>
                <TableCell className="text-sm">{fmt(v.comment_count)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-center">
                    <Tooltip>
                      <TooltipTrigger
                        className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-accent"
                        onClick={() => toggleFav(v)}
                      >
                        <Heart
                          className={`w-4 h-4 ${favs.has(v.video_id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>관심영상 추가</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-accent"
                        onClick={() => setPaywallOpen(true)}
                      >
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>SEO 제목 생성</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-accent"
                        onClick={() => setPaywallOpen(true)}
                      >
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>스크립트 추출</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ScoreModal
        open={scoreModal !== null}
        onClose={() => setScoreModal(null)}
        type={scoreModal === "viral" ? "viral" : "longrun"}
      />
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}
