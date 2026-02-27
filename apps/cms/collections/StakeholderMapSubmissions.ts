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
    group: 'Submissions & Responses',
    useAsTitle: 'submittedBy',
    defaultColumns: ['activity', 'submittedBy', 'submittedAt'],
    description: 'Stakeholder Map submissions: placements of stakeholders in the 2×2 matrix.',
  },
  access: {
    read: ({ req }) => {
      const user = req.user as { userType?: string; id?: string } | null
      if (user?.userType === 'admin') return true
      if (user?.id) return { submittedBy: { equals: user.id } }
      return false
    },
    create: ({ req }) => {
      if (req.user) return true
      const secret = process.env.ACTIVITY_LINK_SECRET
      if (secret && req.headers?.get?.('x-activity-app-secret') === secret) return true
      return false
    },
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'activity',
      type: 'relationship',
      relationTo: 'stakeholder-map-activities',
      required: true,
      admin: { description: 'Activity (stakeholder map) that was submitted' },
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
          name: 'stakeholderId',
          type: 'text',
          required: true,
          admin: { description: 'ID of the stakeholder (from the activity’s stakeholders array)' },
        },
        {
          name: 'quadrant',
          type: 'select',
          required: true,
          options: [...QUADRANT_OPTIONS],
          admin: { description: 'Quadrant in the matrix' },
        },
        {
          name: 'notes',
          type: 'textarea',
          admin: { description: 'Optional notes about this stakeholder' },
        },
      ],
    },
  ],
  timestamps: true,
}
