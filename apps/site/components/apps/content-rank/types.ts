export type ContentRankCategory = 'KEEP' | 'KILL' | 'MERGE'

export interface RankedPage {
  id: string
  url: string
  path: string
  category: ContentRankCategory
  reasons: string[]
  wordCount: number
  inlinks: number
  outlinks: number
  views: number
  engagementTimeSec: number
  conversions: number
}

export interface ContentRankInstance {
  id: string
  title: string
}
