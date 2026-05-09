'use client'
import { VideoResult, GeneratedTitle, ScriptVersion, PatternAnalysis } from './api'

// ─── localStorage 기반 간단 스토어 ───────────────────────────────

const KEYS = {
  SEARCH_HISTORY: 'yt_search_history',
  FAVORITES: 'yt_favorites',
  SAVED_TITLES: 'yt_saved_titles',
  FOOTER_TEMPLATES: 'yt_footer_templates',
}

// 검색 기록
export interface SearchHistoryItem {
  id: string
  keyword: string
  result_count: number
  searched_at: string
}

export const getSearchHistory = (): SearchHistoryItem[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEYS.SEARCH_HISTORY) || '[]')
  } catch {
    return []
  }
}

export const addSearchHistory = (keyword: string, resultCount: number) => {
  const history = getSearchHistory()
  const newItem: SearchHistoryItem = {
    id: Date.now().toString(),
    keyword,
    result_count: resultCount,
    searched_at: new Date().toISOString(),
  }
  // 중복 제거
  const filtered = history.filter(h => h.keyword !== keyword)
  const updated = [newItem, ...filtered]
  localStorage.setItem(KEYS.SEARCH_HISTORY, JSON.stringify(updated))
  return updated
}

export const clearSearchHistory = () => {
  localStorage.removeItem(KEYS.SEARCH_HISTORY)
}

// 관심영상
export const getFavorites = (): VideoResult[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEYS.FAVORITES) || '[]')
  } catch {
    return []
  }
}

export const addFavorite = (video: VideoResult) => {
  const favs = getFavorites()
  if (favs.find(f => f.video_id === video.video_id)) return favs
  const updated = [video, ...favs]
  localStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated))
  return updated
}

export const removeFavorite = (videoId: string) => {
  const favs = getFavorites().filter(f => f.video_id !== videoId)
  localStorage.setItem(KEYS.FAVORITES, JSON.stringify(favs))
  return favs
}

export const isFavorite = (videoId: string): boolean => {
  return getFavorites().some(f => f.video_id === videoId)
}

// 저장된 제목
export interface SavedTitle {
  id: string
  keyword: string
  title: GeneratedTitle
  saved_at: string
}

export const getSavedTitles = (): SavedTitle[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEYS.SAVED_TITLES) || '[]')
  } catch {
    return []
  }
}

export const saveTitle = (keyword: string, title: GeneratedTitle) => {
  const saved = getSavedTitles()
  const newItem: SavedTitle = {
    id: Date.now().toString(),
    keyword,
    title,
    saved_at: new Date().toISOString(),
  }
  const updated = [newItem, ...saved]
  localStorage.setItem(KEYS.SAVED_TITLES, JSON.stringify(updated))
  return updated
}

// 푸터 템플릿
export interface FooterTemplate {
  id: string
  name: string
  content: string
  created_at: string
}

export const getFooterTemplates = (): FooterTemplate[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEYS.FOOTER_TEMPLATES) || '[]')
  } catch {
    return []
  }
}

export const saveFooterTemplate = (name: string, content: string) => {
  const templates = getFooterTemplates()
  const newItem: FooterTemplate = {
    id: Date.now().toString(),
    name,
    content,
    created_at: new Date().toISOString(),
  }
  const updated = [newItem, ...templates]
  localStorage.setItem(KEYS.FOOTER_TEMPLATES, JSON.stringify(updated))
  return updated
}

export const deleteFooterTemplate = (id: string) => {
  const updated = getFooterTemplates().filter(t => t.id !== id)
  localStorage.setItem(KEYS.FOOTER_TEMPLATES, JSON.stringify(updated))
  return updated
}
