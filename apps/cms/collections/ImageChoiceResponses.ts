import type { CollectionConfig } from 'payload'

export const ImageChoiceResponses: CollectionConfig = {
  slug: 'image-choice-responses',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'assessment', 'completedAt', 'createdAt'],
    description: 'Image choice assessment submissions (pair choices and response times)',
  },
  access: {
    create: ({ req }) => {
      if (req.user) return true
      const secret = process.env.ACTIVITY_LINK_SECRET
      if (!secret) return true
      return req.headers?.get?.('x-activity-app-secret') === secret
    },
    read: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    update: () => false,
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'User who completed the assessment (when opened from dashboard with token)' },
    },
    {
      name: 'assessment',
      type: 'relationship',
      relationTo: 'image-choice-assessments',
      required: true,
      admin: { description: 'Assessment that was completed' },
    },
    {
      name: 'responses',
      type: 'json',
      required: true,
      admin: {
        description: 'Array of { pairIndex, side: "left"|"right", elapsedMs } per pair',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      required: true,
      admin: { description: 'When the assessment was completed', readOnly: true },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (data && operation === 'create' && !data.completedAt) {
          data.completedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
