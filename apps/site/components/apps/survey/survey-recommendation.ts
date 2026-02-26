import type { SurveyAnswers } from './types'

export function formatAnswer(v: import('./types').SurveyAnswerValue | undefined): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    const opts = v.filter((x) => typeof x === 'string' && !x.startsWith('__'))
    return opts.join(', ') || '—'
  }
  if (typeof v === 'object' && v !== null) {
    if ('pain' in v) {
      const m = v as { pain?: number; frequency?: string; owner?: string; whatMakesHard?: string; notApplicable?: boolean }
      if (m.notApplicable) return "I don't do this / I've never done this"
      return [m.pain && `Pain ${m.pain}`, m.frequency, m.owner, m.whatMakesHard].filter(Boolean).join(' · ') || '—'
    }
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join('; ') || '—'
  }
  return '—'
}

/** Returns top 3 platform recommendations from survey answers. */
export function computeRecommendation(answers: SurveyAnswers): { platform: string; rationale: string }[] {
  const categories = ['drupal', 'wordpress', 'webflow', 'sanity', 'payload'] as const
  type ScoreKey = (typeof categories)[number]
  const scores: Record<ScoreKey, number> = { drupal: 0, wordpress: 0, webflow: 0, sanity: 0, payload: 0 }

  const technicalComfort = answers['technical-comfort-level']
  if (technicalComfort === 'very-technical') {
    scores['sanity'] += 2
    scores['payload'] += 2
  }
  if (technicalComfort === 'marketing-content' || technicalComfort === 'moderately-technical') {
    scores['webflow'] += 1
    scores['wordpress'] += 1
  }

  const contentRelations = answers['content-relationships']
  if (contentRelations === 'highly-connected' || contentRelations === 'complex-relationships') {
    scores['drupal'] += 2
    scores['sanity'] += 2
    scores['payload'] += 1
  }
  if (contentRelations === 'standalone' || contentRelations === 'some-connections') {
    scores['wordpress'] += 1
    scores['webflow'] += 1
  }

  const multi = answers['multilingual-multisite']
  const multiArr = Array.isArray(multi) ? multi : []
  if (multiArr.some((v) => v === 'multiple-languages' || v === 'multiple-brands-sites')) {
    scores['drupal'] += 2
    scores['sanity'] += 1
  }

  const designFreedom = answers['design-freedom-vs-guardrails']
  if (designFreedom === 'complete-freedom') scores['webflow'] += 2
  if (designFreedom === 'strict-templates') {
    scores['wordpress'] += 1
    scores['drupal'] += 1
  }

  const marketingDynamic = answers['marketing-dynamic-content']
  const marketingPersonalized = answers['marketing-personalized-experiences']
  if (typeof marketingDynamic === 'number' && marketingDynamic >= 4) scores['webflow'] += 1
  if (typeof marketingPersonalized === 'number' && marketingPersonalized >= 4) scores['webflow'] += 2

  const leadGen = answers['lead-generation-priority']
  if (leadGen === 'lead-gen') {
    scores['webflow'] += 1
    scores['sanity'] += 1
  }
  if (leadGen === 'brand-info') {
    scores['wordpress'] += 1
    scores['webflow'] += 1
  }

  const integrationPriority = answers['integration-priority']
  if (integrationPriority === 'native-maintained') {
    scores['wordpress'] += 1
    scores['drupal'] += 1
  }
  if (integrationPriority === 'api-access' || integrationPriority === 'build-middleware') {
    scores['sanity'] += 1
    scores['payload'] += 1
  }

  const devResources = answers['development-resources']
  if (devResources === 'no-developer') {
    scores['webflow'] += 2
    scores['wordpress'] += 2
  }
  if (devResources === 'fulltime-internal') {
    scores['sanity'] += 1
    scores['payload'] += 1
    scores['drupal'] += 1
  }

  const contentVolume = answers['content-volume']
  if (contentVolume === '10000-plus' || contentVolume === '2000-10000') {
    scores['drupal'] += 2
    scores['sanity'] += 1
  }
  if (contentVolume === 'under-100' || contentVolume === '100-500') {
    scores['wordpress'] += 1
    scores['webflow'] += 1
  }

  const budget = answers['platform-budget-annual']
  if (budget === 'under-2k' || budget === '2k-10k') {
    scores['wordpress'] += 2
    scores['webflow'] += 1
  }
  if (budget === '50k-plus') {
    scores['drupal'] += 1
    scores['sanity'] += 1
  }

  const ranking = answers['ideal-workflow-ranking']
  const rankArr = Array.isArray(ranking) ? (ranking as string[]) : []
  const first = rankArr[0]
  if (first === 'see-as-you-build' || first === 'drag-drop-sections') scores['webflow'] += 2
  if (first === 'custom-code') {
    scores['sanity'] += 2
    scores['payload'] += 2
  }
  if (rankArr.indexOf('template-library') <= 1) {
    scores['wordpress'] += 1
    scores['drupal'] += 1
  }

  const labels: Record<string, string> = {
    drupal: 'Drupal',
    wordpress: 'WordPress',
    webflow: 'Webflow',
    sanity: 'Sanity',
    payload: 'Payload',
  }
  const rationales: Record<string, string> = {
    drupal: 'Your scale, structure, and enterprise needs align well with Drupal.',
    wordpress: 'Your team and content needs align well with WordPress\'s ecosystem and cost profile.',
    webflow: 'Visual editing and design freedom are a strong match for Webflow.',
    sanity: 'Your content structure and API-first workflow point toward Sanity.',
    payload: 'Your technical setup and flexibility needs point toward Payload.',
  }

  const sorted = [...categories]
    .map((c) => ({ platform: c, score: scores[c] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  const topThree = sorted.slice(0, 3).map(({ platform }) => ({
    platform: labels[platform] ?? platform,
    rationale: rationales[platform] ?? 'Based on your answers, this platform could be a good fit.',
  }))

  if (topThree.length === 0 || sorted[0]?.score === 0) {
    return [
      { platform: 'Payload', rationale: 'Based on your answers, a flexible CMS like Payload could be a good fit. Answer more questions for a more specific recommendation.' },
      { platform: 'WordPress', rationale: 'Your team and content needs may align with WordPress\'s ecosystem and cost profile.' },
      { platform: 'Webflow', rationale: 'Visual editing and design freedom are a strong match for Webflow.' },
    ]
  }

  return topThree
}
