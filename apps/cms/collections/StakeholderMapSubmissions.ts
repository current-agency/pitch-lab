import type { CollectionConfig } from 'payload'

const QUADRANT_OPTIONS = [
  { label: 'Key Players', value: 'key-players' },
  { label: 'Keep Satisfied', value: 'keep-satisfied' },
  { label: 'Keep Informed', value: 'keep-informed' },
  { label: 'Monitor', value: 'monitor' },
] as const

export const StakeholderMapSubmissions: CollectionConfig = {
  slug: 'stakeholder-map-submissions',
  admin: {
    useAsTitle: 'submittedBy',
    defaultColumns: ['company', 'submittedBy', 'submittedAt'],
    description: 'Stakeholder Map submissions: placements of stakeholders in the 2×2 matrix.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => {
      if (req.user) return true
      const secret = process.env.STAKEHOLDER_MAP_API_SECRET
      if (secret && req.headers?.get?.('x-stakeholder-map-secret') === secret) return true
      return false
    },
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      required: true,
      admin: { description: 'Company this map is for' },
    },
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { description: 'User who submitted the map' },
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { description: 'When the submission was made', readOnly: true },
    },
    {
      name: 'placements',
      type: 'array',
      required: true,
      admin: { description: 'Stakeholder placed in each quadrant' },
      fields: [
        {
          name: 'stakeholder',
          type: 'relationship',
          relationTo: 'stakeholders',
          required: true,
          admin: { description: 'Stakeholder' },
        },
        {
          name: 'quadrant',
          type: 'select',
          required: true,
          options: [...QUADRANT_OPTIONS],
          admin: { description: 'Quadrant in the matrix' },
        },
      ],
    },
  ],
  timestamps: true,
}
