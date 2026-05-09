import { NextRequest, NextResponse } from 'next/server'

const YT = 'https://www.googleapis.com/youtube/v3'
const KEY = process.env.YOUTUBE_API_KEY || ''

// ─── Duration helpers ──────────────────────────────────────────────

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0')
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

function daysSince(publishedAt: string): number {
  const diff = Date.now() - new Date(publishedAt).getTime()
  return Math.max(1, Math.floor(diff / 86400000))
}

function getPeriodDate(period: string): string {
  const now = new Date()
  const map: Record<string, number> = { today: 1, week: 7, month: 30, year: 365 }
  now.setDate(now.getDate() - (map[period] ?? 1))
  return now.toISOString()
}

// ─── YouTube API calls ────────────────────────────────────────────

async function ytGet(path: string, params: Record<string, string>) {
  const url = new URL(`${YT}/${path}`)
  Object.entries({ ...params, key: KEY }).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  return res.json()
}

async function getVideoDetails(ids: string[]) {
  const data = await ytGet('videos', {
    part: 'statistics,contentDetails',
    id: ids.join(','),
  })
  const map: Record<string, any> = {}
  for (const item of data.items ?? []) {
    map[item.id] = {
      viewCount: item.statistics?.viewCount ?? '0',
      likeCount: item.statistics?.likeCount,
      commentCount: item.statistics?.commentCount,
      duration: item.contentDetails?.duration ?? 'PT0S',
    }
  }
  return map
}

async function getChannelDetails(ids: string[]) {
  const data = await ytGet('channels', {
    part: 'statistics',
    id: [...new Set(ids)].join(','),
  })
  const map: Record<string, any> = {}
  for (const item of data.items ?? []) {
    map[item.id] = { subscriberCount: item.statistics?.subscriberCount ?? '0' }
  }
  return map
}

// ─── POST handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ detail: 'YouTube API 키가 설정되지 않았습니다.' }, { status: 500 })
  }

  const body = await req.json()
  const {
    keyword, max_results = 20, period, duration, content_type = 'long',
    min_views, max_subscribers, min_viral_score, sort_by = 'viral_score', page_token,
  } = body

  if (!keyword?.trim()) {
    return NextResponse.json({ detail: '키워드를 입력해주세요.' }, { status: 400 })
  }

  try {
    // 1. 검색
    const searchParams: Record<string, string> = {
      part: 'snippet',
      q: keyword,
      type: 'video',
      maxResults: '50',
      relevanceLanguage: 'ko',
      regionCode: 'KR',
    }
    if (page_token) searchParams.pageToken = page_token
    if (period && period !== 'all') searchParams.publishedAfter = getPeriodDate(period)
    if (content_type === 'short') searchParams.videoDuration = 'short'
    else if (content_type === 'long') searchParams.videoDuration = 'long'

    const searchData = await ytGet('search', searchParams)

    if (searchData.error) {
      return NextResponse.json({ detail: `YouTube API 오류: ${searchData.error.message}` }, { status: 400 })
    }

    const items: any[] = searchData.items ?? []
    const nextPageToken: string | undefined = searchData.nextPageToken

    if (!items.length) {
      return NextResponse.json({ keyword, results: [], total: 0, cached: false })
    }

    const videoIds = items.map((i: any) => i.id.videoId)
    const channelIds = items.map((i: any) => i.snippet.channelId)

    // 2. 상세 정보 병렬 조회
    const [videoDetails, channelDetails] = await Promise.all([
      getVideoDetails(videoIds),
      getChannelDetails(channelIds),
    ])

    // 3. 합치기
    let results = items.map((item: any) => {
      const vid = item.id.videoId
      const chId = item.snippet.channelId
      const vd = videoDetails[vid]
      if (!vd) return null

      const publishedAt = item.snippet.publishedAt
      const durationSec = parseDuration(vd.duration)
      const days = daysSince(publishedAt)
      const views = parseInt(vd.viewCount ?? '0')
      const subscribers = parseInt(channelDetails[chId]?.subscriberCount ?? '0')
      const isShort = durationSec <= 60 || item.snippet.description?.toLowerCase().includes('#shorts')
      const viralScore = subscribers > 0 ? Math.round((views / subscribers / days) * 10000) / 10000 : 0
      const longRunScore = subscribers > 0 ? Math.round((views / subscribers) * 10000) / 10000 : 0

      return {
        video_id: vid,
        title: item.snippet.title,
        channel_id: chId,
        channel_name: item.snippet.channelTitle,
        thumbnail_url: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
        view_count: views,
        like_count: vd.likeCount ? parseInt(vd.likeCount) : null,
        comment_count: vd.commentCount ? parseInt(vd.commentCount) : null,
        subscriber_count: subscribers > 0 ? subscribers : null,
        published_at: publishedAt,
        duration_seconds: durationSec,
        duration_label: formatDuration(durationSec),
        viral_score: viralScore,
        long_run_score: longRunScore,
        days_since_upload: days,
        is_short: isShort,
      }
    }).filter(Boolean)

    // 4. 필터
    if (content_type === 'short') results = results.filter((r: any) => r.is_short)
    else if (content_type === 'long') results = results.filter((r: any) => !r.is_short)

    if (duration && duration !== 'all') {
      const ranges: Record<string, [number, number | null]> = {
        short: [0, 60], medium: [61, 1200], long: [1201, null],
      }
      const [lo, hi] = ranges[duration] ?? [0, null]
      results = results.filter((r: any) => r.duration_seconds >= lo && (hi === null || r.duration_seconds <= hi))
    }
    if (min_views) results = results.filter((r: any) => r.view_count >= min_views)
    if (max_subscribers) results = results.filter((r: any) => !r.subscriber_count || r.subscriber_count <= max_subscribers)
    if (min_viral_score) results = results.filter((r: any) => r.viral_score >= min_viral_score)

    // 5. 정렬
    const sortMap: Record<string, string> = {
      viral_score: 'viral_score', long_run_score: 'long_run_score',
      views: 'view_count', date: 'published_at',
    }
    const sortKey = sortMap[sort_by] ?? 'viral_score'
    results.sort((a: any, b: any) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      return typeof av === 'string' ? bv.localeCompare(av) : bv - av
    })

    return NextResponse.json({
      keyword,
      results: results.slice(0, max_results),
      total: results.length,
      cached: false,
      next_page_token: nextPageToken,
    })
  } catch (e: any) {
    return NextResponse.json({ detail: `검색 오류: ${e.message}` }, { status: 500 })
  }
}
