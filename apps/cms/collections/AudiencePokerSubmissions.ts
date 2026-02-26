import type { CollectionConfig } from 'payload'

type UserLike = { userType?: string }

export const AudiencePokerSubmissions: CollectionConfig = {
  slug: 'audience-poker-submissions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['activity', 'user', 'submittedAt'],
    description: 'Audience Poker submissions (chip allocations per activity).',
  },
  access: {
    create: ({ req }) => {
      const secret = process.env.ACTIVITY_LINK_SECRET
      if (!secret) return true
      return req.headers?.get?.('x-activity-app-secret') === secret || (req.user as UserLike)?.userType === 'admin'
    },
    read: ({ req }) => {
      const secret = process.env.ACTIVITY_LINK_SECRET
      if (secret && req.headers?.get?.('x-activity-app-secret') === secret) return true
      return (req.user as UserLike)?.userType === 'admin'
    },
    update: () => false,
    delete: ({ req }) => (req.user as UserLike)?.userType === 'admin',
  },
  fields: [
    {
      name: 'activity',
      type: 'relationship',
      relationTo: 'audience-poker-activities',
      required: true,
      admin: { description: 'Activity that was submitted' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { description: 'User who submitted' },
    },
    {
      name: 'allocations',
      type: 'array',
      required: true,
      admin: { description: 'Chips allocated per audience (audienceLabel denormalized for reporting)' },
      fields: [
        { name: 'audienceLabel', type: 'text', required: true },
        { name: 'chips', type: 'number', required: true, min: 1 },
      ],
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      admin: { description: 'When the submission was made', readOnly: true },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (data && operation === 'create' && !data.submittedAt) {
          data.submittedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
