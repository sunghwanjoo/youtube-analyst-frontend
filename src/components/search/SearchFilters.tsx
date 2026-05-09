"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";

export interface FilterState {
  period: string;
  duration: string;
  content_type: string;
  sort_by: string;
  max_results: number;
  min_views: string;
  max_subscribers: string;
  min_viral_score: string;
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onSearch?: () => void;
}

export function SearchFilters({ filters, onChange, onSearch }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (key: keyof FilterState, val: string | number | null) =>
    onChange({ ...filters, [key]: val ?? "" });

  return (
    <div className="space-y-3">
      {/* 기본 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 콘텐츠 타입 */}
        <div className="flex rounded-md border overflow-hidden">
          {(["all", "long", "short"] as const).map((t) => (
            <button
              key={t}
              onClick={() => set("content_type", t)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.content_type === t
                  ? "bg-red-600 text-white"
                  : "bg-white text-muted-foreground hover:bg-gray-50"
              }`}
            >
              {t === "all" ? "전체" : t === "long" ? "롱폼" : "쇼츠"}
            </button>
          ))}
        </div>

        {/* 기간 */}
        <Select value={filters.period} onValueChange={(v) => set("period", v)}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 기간</SelectItem>
            <SelectItem value="today">오늘</SelectItem>
            <SelectItem value="week">1주일</SelectItem>
            <SelectItem value="month">1달</SelectItem>
            <SelectItem value="year">1년</SelectItem>
          </SelectContent>
        </Select>

        {/* 영상 길이 */}
        <Select value={filters.duration} onValueChange={(v) => set("duration", v)}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 길이</SelectItem>
            <SelectItem value="short">쇼츠(1분↓)</SelectItem>
            <SelectItem value="medium">단편(20분↓)</SelectItem>
            <SelectItem value="long">장편(20분↑)</SelectItem>
          </SelectContent>
        </Select>

        {/* 정렬 */}
        <Select value={filters.sort_by} onValueChange={(v) => set("sort_by", v)}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viral_score">떡상지수순</SelectItem>
            <SelectItem value="long_run_score">롱런지수순</SelectItem>
            <SelectItem value="views">조회수순</SelectItem>
            <SelectItem value="date">최신순</SelectItem>
          </SelectContent>
        </Select>

        {/* 결과 수 */}
        <Select
          value={String(filters.max_results)}
          onValueChange={(v) => set("max_results", Number(v))}
        >
          <SelectTrigger className="w-24 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20개</SelectItem>
            <SelectItem value="50">50개</SelectItem>
            <SelectItem value="100">100개</SelectItem>
            <SelectItem value="200">200개</SelectItem>
          </SelectContent>
        </Select>

        {/* 고급 필터 토글 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-9 gap-1"
        >
          <Filter className="w-4 h-4" />
          고급 필터
          {showAdvanced ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
      </div>

      {/* 고급 필터 */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">구독자 상한</span>
            <Input
              type="number"
              placeholder="예: 100000"
              value={filters.max_subscribers}
              onChange={(e) => set("max_subscribers", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
              className="w-32 h-8 text-sm"
            />
            <Button size="sm" variant="secondary" className="h-8" onClick={() => onSearch?.()}>
              적용
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">최소 조회수</span>
            <Input
              type="number"
              placeholder="예: 50000"
              value={filters.min_views}
              onChange={(e) => set("min_views", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
              className="w-32 h-8 text-sm"
            />
            <Button size="sm" variant="secondary" className="h-8" onClick={() => onSearch?.()}>
              적용
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">떡상지수 하한</span>
            <Input
              type="number"
              step="0.1"
              placeholder="예: 5"
              value={filters.min_viral_score}
              onChange={(e) => set("min_viral_score", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
              className="w-28 h-8 text-sm"
            />
            <Button size="sm" variant="secondary" className="h-8" onClick={() => onSearch?.()}>
              적용
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
