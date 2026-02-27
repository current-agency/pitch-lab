/**
 * Helpers for checking if a user has an activity/assessment in assignedApplications.
 * Used by submit routes to enforce that only assigned items can receive submissions.
 */

type RelationTo = 'image-choice-assessments' | 'audience-poker-activities' | 'stakeholder-map-activities'

/** Accepts user shape from CMS API (assignedApplications may be polymorphic array). */
export function isAssigned(
  user: { assignedApplications?: unknown } | null | undefined,
  relationTo: RelationTo,
  id: string
): boolean {
  const list = user?.assignedApplications
  if (!Array.isArray(list)) return false
  return list.some((item: unknown) => {
    const i = item as { relationTo?: string; value?: string | { id?: string } }
    if (i.relationTo !== relationTo) return false
    const v = i.value
    return typeof v === 'string' ? v === id : (v as { id?: string })?.id === id
  })
}
