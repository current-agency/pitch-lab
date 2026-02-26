/** Minimal types for assessment data from CMS API (image-choice-assessments). */

export interface MediaDoc {
  id: string
  url?: string | null
  alt?: string | null
}

export interface ImagePair {
  id?: string | null
  pairTitle?: string | null
  imageLeft: string | MediaDoc
  imageRight: string | MediaDoc
  question?: string | null
}

export interface ImageChoiceAssessment {
  id: string
  title: string
  description?: string | null
  imagePairs: ImagePair[]
  duration: number
  isActive?: boolean | null
  instructions?: { root?: { children?: unknown[] } } | null
}

export function getMediaUrl(media: string | MediaDoc): string | null {
  if (typeof media === 'string') return null
  return media?.url ?? null
}
