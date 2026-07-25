import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// ─── Types ────────────────────────────────────────────────────────

export interface VideoResult {
  video_id: string
  title: string
  channel_id: string
  channel_name: string
  thumbnail_url: string
  view_count: number
  like_count?: number
  comment_count?: number
  subscriber_count?: number
  published_at: string
  duration_seconds: number
  duration_label: string
  viral_score?: number
  long_run_score?: number
  days_since_upload: number
  is_short: boolean
}

export interface SearchRequest {
  keyword: string
  max_results?: number
  period?: string
  duration?: string
  content_type?: string
  min_views?: number
  max_subscribers?: number
  min_viral_score?: number
  language?: string
  sort_by?: string
  page_token?: string
}

export interface SearchResponse {
  keyword: string
  results: VideoResult[]
  total: number
  cached: boolean
  next_page_token?: string
}

export interface PatternAnalysis {
  has_number_ratio: number
  is_question_ratio: number
  avg_length: number
  power_words: string[]
  common_patterns: string[]
  top_titles: string[]
}

export interface GeneratedTitle {
  title: string
  seo_score: number
  score_breakdown: Record<string, number>
  reasons: string[]
  tags?: string[]
  title_type?: string  // "variation" | "new"
}

export interface TitleGenerationResponse {
  keyword: string
  pattern_analysis: PatternAnalysis
  competition_level: string
  competition_reason: string
  titles: GeneratedTitle[]
}

export interface ScriptExtractionResponse {
  video_id: string
  title: string
  raw_script: string
  cleaned_script: string
  word_count: number
  has_manual_subtitle: boolean
  tags: string[]
}

export interface ScriptVersion {
  version_number: number
  title: string
  script: string
  channel_mapping?: string
}

export interface ScriptRewriteResponse {
  versions: ScriptVersion[]
}

// ─── API Calls ────────────────────────────────────────────────────

export interface SearchUsage {
  loggedIn: boolean
  plan?: 'free' | 'paid'
  remaining?: number | null
  limit?: number
}

export const searchVideos = (req: SearchRequest) =>
  api.post<SearchResponse>('/search', req).then(r => r.data)

export const getSearchUsage = () =>
  api.get<SearchUsage>('/search/usage').then(r => r.data)

export const generateTitles = (
  keyword: string,
  topTitles: string[],
  patternAnalysis: PatternAnalysis,
  forcedKeywords?: string[],
  count = 5,
  avgSubscribers = 0,
) =>
  api.post<TitleGenerationResponse>(
    `/seo/generate-titles?avg_subscribers=${avgSubscribers}`,
    { keyword, top_video_titles: topTitles, pattern_analysis: patternAnalysis, forced_keywords: forcedKeywords, count }
  ).then(r => r.data)

export const analyzePatterns = (titles: string[]) =>
  api.post<PatternAnalysis>('/seo/analyze-patterns', titles).then(r => r.data)

export const generateDescription = (title: string, keyword: string, footerTemplate = '') =>
  api.post<{ description: string }>(`/seo/generate-description?title=${encodeURIComponent(title)}&keyword=${encodeURIComponent(keyword)}&footer_template=${encodeURIComponent(footerTemplate)}`).then(r => r.data)

export const extractScript = (videoUrl: string, useWhisper = false) =>
  api.post<ScriptExtractionResponse>('/script/extract', { video_url: videoUrl, use_whisper: useWhisper }).then(r => r.data)

export const rewriteScript = (originalScript: string, keyword: string, titles: string[], versionCount: number) =>
  api.post<ScriptRewriteResponse>('/script/rewrite', {
    original_script: originalScript,
    keyword,
    titles,
    version_count: versionCount,
  }).then(r => r.data)

export const lightRewriteScript = (originalScript: string) =>
  api.post<{ script: string }>('/script/light-rewrite', { original_script: originalScript }).then(r => r.data)

// ─── Stage4: 채널 연동 & 예약 관리 ─────────────────────────────────

export interface ConnectedChannel {
  id: string
  userId: string
  channelId: string
  channelName: string
  thumbnailUrl?: string | null
  connectedAt: string
}

export interface ScheduledPublish {
  id: string
  userId: string
  channelId: string
  title: string
  description: string
  tags: string[]
  script: string
  scheduledAt: string
  status: 'pending' | 'published' | 'cancelled'
  createdAt: string
}

export const getChannels = () =>
  api.get<{ channels: ConnectedChannel[] }>('/channels').then(r => r.data.channels)

export const syncChannels = () =>
  api.post<{ ok: boolean; count: number }>('/channels/sync').then(r => r.data)

export const getSchedules = () =>
  api.get<{ items: ScheduledPublish[] }>('/publish/schedules').then(r => r.data.items)

export const createSchedule = (req: {
  channelId: string
  title: string
  description?: string
  tags?: string[]
  script?: string
  scheduledAt: string
}) =>
  api.post<{ item: ScheduledPublish }>('/publish/schedules', req).then(r => r.data.item)

export const updateScheduleStatus = (id: string, status: ScheduledPublish['status']) =>
  api.patch<{ item: ScheduledPublish }>(`/publish/schedules/${id}`, { status }).then(r => r.data.item)

export const deleteSchedule = (id: string) =>
  api.delete(`/publish/schedules/${id}`)

export const getUploadSessionUrl = (scheduleId: string, fileSizeBytes: number, fileMimeType: string) =>
  api.post<{ uploadUrl: string }>('/publish/upload-session', { scheduleId, fileSizeBytes, fileMimeType }).then(r => r.data.uploadUrl)
