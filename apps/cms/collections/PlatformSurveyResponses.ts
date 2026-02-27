import type { CollectionConfig } from 'payload'

export const PlatformSurveyResponses: CollectionConfig = {
  slug: 'platform-survey-responses',
  admin: {
    group: 'Submissions & Responses',
    useAsTitle: 'id',
    defaultColumns: ['company', 'submittedAt', 'respondent', 'completionTime'],
    description: 'Platform Fit Quiz submissions',
  },
  access: {
    create: ({ req }) => {
      if (req.user) return true
      const secret = process.env.ACTIVITY_LINK_SECRET
      if (!secret) return true
      return req.headers?.get?.('x-activity-app-secret') === secret
    },
    read: ({ req }) => {
      const user = req.user as { userType?: string; id?: string } | null
      if (user?.userType === 'admin') return true
      if (user?.id) return { user: { equals: user.id } }
      return false
    },
    update: () => false,
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      hasMany: false,
      admin: { description: 'Company this response belongs to, when the survey was taken via ?company= link.' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: { description: 'User who submitted (set automatically when submitted via dashboard).' },
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      admin: { description: 'When the response was submitted', readOnly: true },
    },
    {
      name: 'respondent',
      type: 'group',
      admin: { description: 'Optional respondent info' },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'company', type: 'text' },
      ],
    },
    {
      name: 'answers',
      type: 'json',
      required: true,
      admin: { description: 'Full questionKey → value answer map' },
    },
    {
      name: 'completionTime',
      type: 'number',
      admin: { description: 'Time from start to submit in seconds' },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (data && operation === 'create' && !data.submittedAt) {
          data.submittedAt = new Date().toISOString()
        }
        if (data && operation === 'create' && req.user && !data.user) {
          data.user = (req.user as { id: string }).id
        }
        return data
      },
    ],
  },
}
