import type { CollectionConfig } from 'payload'

/**
 * Assignable "Platform Fit Quiz" (survey) entry. When added to a user's assignedApplications,
 * the user sees the survey card on the dashboard. Same assignment pattern as image-choice,
 * audience-poker, and stakeholder-map.
 */
export const PlatformSurveyAssignments: CollectionConfig = {
  slug: 'platform-survey-assignments',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
    description: 'Assign the Platform Fit Quiz to users via the User’s Assigned applications field.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Platform Fit Quiz',
      admin: {
        description: 'Label shown on the dashboard card (e.g. Platform Fit Quiz).',
      },
    },
  ],
  timestamps: true,
}
