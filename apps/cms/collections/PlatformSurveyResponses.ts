import type { CollectionConfig } from 'payload'

export const PlatformSurveyResponses: CollectionConfig = {
  slug: 'platform-survey-responses',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['company', 'submittedAt', 'respondent', 'completionTime'],
    description: 'Platform Fit Quiz submissions',
  },
  access: {
    create: () => true,
    read: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
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
      ({ data, operation }) => {
        if (data && operation === 'create' && !data.submittedAt) {
          data.submittedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
