/**
 * Canonical section order for the platform survey. Content Complexity first.
 * Used by platform-survey-api and payload.config so section order is consistent.
 */

/** Section slugs in display order; unknown sections sort to the end. */
const SECTION_ORDER = [
  'content-complexity',
  'editor-autonomy',
  'marketing-personalization',
  'integration-ecosystem',
  'team-resources',
  'scale-performance',
  'budget-timeline',
  'future-vision',
  'day-in-the-life',
  'workflow-builder',
  'who-does-what',
  'current-platform',
  'future-state-wishlist',
] as const

/** Display label for each section value (for API responses; not stored on questions). */
export const SECTION_LABELS: Record<string, string> = {
  'content-complexity': 'Content Complexity',
  'editor-autonomy': 'Editor Autonomy',
  'marketing-personalization': 'Marketing Personalization',
  'integration-ecosystem': 'Integration Ecosystem',
  'team-resources': 'Team Resources',
  'scale-performance': 'Scale & Performance',
  'budget-timeline': 'Budget & Timeline',
  'future-vision': 'Future Vision',
  'day-in-the-life': 'Day in the Life',
  'workflow-builder': 'Workflow Builder',
  'who-does-what': 'Who Does What',
  'current-platform': 'Current Platform Assessment',
  'future-state-wishlist': 'Future State Wishlist',
}

/** Sorts grouped sections so Content Complexity is first. */
export function sortGroupedSections<T extends { section: string }>(grouped: T[]): T[] {
  return [...grouped].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.section as (typeof SECTION_ORDER)[number])
    const bi = SECTION_ORDER.indexOf(b.section as (typeof SECTION_ORDER)[number])
    const aIdx = ai === -1 ? SECTION_ORDER.length : ai
    const bIdx = bi === -1 ? SECTION_ORDER.length : bi
    return aIdx - bIdx
  })
}
