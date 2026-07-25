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

export interface ScriptVersion {
  version_number: number
  title: string
  script: string
  channel_mapping?: string
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

// ─── 제작소 (Workshop): 원본 추출 + 제목/스크립트 재구성 통합 ───────

export interface WorkshopExtractResponse {
  keyword: string
  sourceVideoId: string
  sourceTitle: string
  sourceDescription: string
  sourceThumbnailUrl: string
  sourceScript: string
  generatedTitles: GeneratedTitle[]
  generatedScripts: ScriptVersion[]
  competitionLevel: string
  competitionReason: string
  patternAnalysis: PatternAnalysis
}

export interface WorkshopItem {
  id: string
  userId: string
  keyword: string
  sourceVideoId: string
  sourceTitle: string
  sourceDescription: string
  sourceThumbnailUrl?: string | null
  sourceScript: string
  generatedTitles: GeneratedTitle[]
  generatedScripts: ScriptVersion[]
  createdAt: string
  updatedAt: string
}

export const extractForWorkshop = (params: {
  videoId: string
  keyword: string
  topTitles?: string[]
  avgSubscribers?: number
}) =>
  api.post<WorkshopExtractResponse>('/workshop/extract', params).then(r => r.data)

export const getWorkshopItems = () =>
  api.get<{ items: WorkshopItem[] }>('/workshop').then(r => r.data.items)

export const getWorkshopItem = (id: string) =>
  api.get<{ item: WorkshopItem }>(`/workshop/${id}`).then(r => r.data.item)

export const createWorkshopItem = (payload: Omit<WorkshopItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
  api.post<{ item: WorkshopItem }>('/workshop', payload).then(r => r.data.item)

export const updateWorkshopItem = (
  id: string,
  payload: Partial<Pick<WorkshopItem, 'keyword' | 'sourceTitle' | 'sourceDescription' | 'sourceScript' | 'generatedTitles' | 'generatedScripts'>>
) =>
  api.patch<{ item: WorkshopItem }>(`/workshop/${id}`, payload).then(r => r.data.item)

export const deleteWorkshopItem = (id: string) =>
  api.delete(`/workshop/${id}`)

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
