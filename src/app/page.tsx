"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { searchVideos, getSearchUsage, SearchRequest, VideoResult } from "@/lib/api";
import { addSearchHistory, getSearchHistory, SearchHistoryItem } from "@/lib/store";
import { VideoTable } from "@/components/search/VideoTable";
import { SearchFilters, FilterState } from "@/components/search/SearchFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, Loader2, ChevronDown } from "lucide-react";
import { useSession, signIn } from "@/lib/auth-client";

const DEFAULT_FILTERS: FilterState = {
  period: "all",
  duration: "all",
  content_type: "long",
  sort_by: "long_run_score",
  max_results: 20,
  min_views: "",
  max_subscribers: "",
  min_viral_score: "",
};

// 검색 결과 화면 상태 — 다른 페이지 갔다가 뒤로가기 해도 유지되도록 sessionStorage에 저장
const SEARCH_STATE_KEY = "yt_search_page_state";

interface SearchPageState {
  keyword: string;
  filters: FilterState;
  allResults: VideoResult[];
  nextPageToken?: string;
  currentReq: SearchRequest | null;
}

function loadSearchState(): SearchPageState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SearchPage() {
  const [initial] = useState(() => loadSearchState());
  const [keyword, setKeyword] = useState(initial?.keyword ?? "");
  const [filters, setFilters] = useState<FilterState>(initial?.filters ?? DEFAULT_FILTERS);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [allResults, setAllResults] = useState<VideoResult[]>(initial?.allResults ?? []);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(initial?.nextPageToken);
  const currentReqRef = useRef<SearchRequest | null>(initial?.currentReq ?? null);
  const queryClient = useQueryClient();

  const { data: session, isPending: sessionPending } = useSession();

  const { data: usage } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
    enabled: !!session,
  });

  useEffect(() => { setHistory(getSearchHistory()); }, []);

  useEffect(() => {
    sessionStorage.setItem(
      SEARCH_STATE_KEY,
      JSON.stringify({ keyword, filters, allResults, nextPageToken, currentReq: currentReqRef.current })
    );
  }, [keyword, filters, allResults, nextPageToken]);

  const mutation = useMutation({
    mutationFn: (req: SearchRequest) => searchVideos(req),
    onSuccess: (data, req) => {
      if (req.page_token) {
        // 더 보기: 기존 결과에 추가
        setAllResults((prev) => {
          const existingIds = new Set(prev.map((v) => v.video_id));
          const newItems = data.results.filter((v) => !existingIds.has(v.video_id));
          return [...prev, ...newItems];
        });
      } else {
        // 새 검색: 결과 교체
        setAllResults(data.results);
        const updated = addSearchHistory(data.keyword, data.total);
        setHistory(updated);
        queryClient.invalidateQueries({ queryKey: ["search-usage"] });
      }
      setNextPageToken(data.next_page_token);
    },
  });

  const buildReq = useCallback((): SearchRequest => ({
    keyword: keyword.trim(),
    max_results: filters.max_results,
    period: filters.period === "all" ? undefined : filters.period,
    duration: filters.duration === "all" ? undefined : filters.duration,
    content_type: filters.content_type === "all" ? undefined : filters.content_type,
    sort_by: filters.sort_by,
    min_views: filters.min_views ? Number(filters.min_views) : undefined,
    max_subscribers: filters.max_subscribers ? Number(filters.max_subscribers) : undefined,
    min_viral_score: filters.min_viral_score ? Number(filters.min_viral_score) : undefined,
  }), [keyword, filters]);

  const handleSearch = useCallback(() => {
    if (!keyword.trim()) return;
    const req = buildReq();
    currentReqRef.current = req;
    setNextPageToken(undefined);
    mutation.mutate(req);
  }, [buildReq, keyword, mutation]);

  const handleLoadMore = () => {
    if (!currentReqRef.current || !nextPageToken) return;
    mutation.mutate({ ...currentReqRef.current, page_token: nextPageToken });
  };

  const handleHistoryClick = (kw: string) => {
    setKeyword(kw);
    const req: SearchRequest = { keyword: kw, max_results: filters.max_results, sort_by: filters.sort_by };
    currentReqRef.current = req;
    setNextPageToken(undefined);
    mutation.mutate(req);
  };

  const keyword_display = currentReqRef.current?.keyword ?? "";

  if (sessionPending) return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Search className="w-12 h-12 mb-4 opacity-20" />
        <h1 className="text-xl font-bold mb-2">검색 & 분석</h1>
        <p className="text-muted-foreground text-sm mb-6">
          로그인하면 하루 5회 무료로 검색할 수 있어요
        </p>
        <Button
          onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
          className="h-10 px-6 bg-red-600 hover:bg-red-700"
        >
          Google로 로그인
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">검색 & 분석</h1>
          <p className="text-muted-foreground text-sm mt-1">
            키워드로 떡상한 영상을 찾아보세요
          </p>
        </div>
        {usage && usage.plan === "free" && (
          <Badge variant="secondary" className="text-xs">
            오늘 {usage.remaining ?? 0}/{usage.limit} 회 남음
          </Badge>
        )}
      </div>

      {/* 검색창 */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-10"
            placeholder="키워드 입력 (예: 주식 투자, 다이어트 방법)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={mutation.isPending || !keyword.trim()}
          className="h-10 bg-red-600 hover:bg-red-700"
        >
          {mutation.isPending && !currentReqRef.current?.page_token ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "검색"
          )}
        </Button>
      </div>

      {/* 검색 기록 */}
      {history.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {history.slice(0, 10).map((h) => (
            <Badge
              key={h.id}
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200 text-xs"
              onClick={() => handleHistoryClick(h.keyword)}
            >
              {h.keyword}
            </Badge>
          ))}
        </div>
      )}

      {/* 필터 */}
      <SearchFilters filters={filters} onChange={setFilters} onSearch={handleSearch} />

      {/* 에러 */}
      {mutation.isError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {(mutation.error as any)?.response?.data?.detail || "검색 중 오류가 발생했습니다. YouTube API 키를 확인해주세요."}
        </div>
      )}

      {/* 결과 */}
      {allResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <strong className="text-foreground">&quot;{keyword_display}&quot;</strong> 검색 결과{" "}
              <strong>{allResults.length}개</strong> 표시 중
            </span>
          </div>
          <VideoTable videos={allResults} keyword={keyword_display} />

          {/* 더 보기 버튼 */}
          {nextPageToken && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={mutation.isPending}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                더 보기 (50개 추가)
              </Button>
            </div>
          )}
        </div>
      )}

      {allResults.length === 0 && !mutation.isPending && !mutation.isError && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Search className="w-12 h-12 mb-4 opacity-20" />
          <p>키워드를 입력하고 검색해보세요</p>
          <p className="text-xs mt-1">떡상지수가 높은 영상을 자동으로 정렬해드립니다</p>
        </div>
      )}
    </div>
  );
}
