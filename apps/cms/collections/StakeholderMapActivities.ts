import type { CollectionConfig } from 'payload'

type UserLike = { userType?: string }

export const StakeholderMapActivities: CollectionConfig = {
  slug: 'stakeholder-map-activities',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'company', 'isActive', 'updatedAt'],
    description:
      'Create an activity, set the company, then add stakeholders. Assign the activity to users so they can map those stakeholders by influence and interest.',
  },
  access: {
    create: ({ req }) => (req.user as UserLike)?.userType === 'admin',
    read: ({ req }) => {
      if (req.user) return true
      const secret = process.env.ACTIVITY_LINK_SECRET
      if (secret && req.headers?.get?.('x-activity-app-secret') === secret) return true
      return false
    },
    update: ({ req }) => (req.user as UserLike)?.userType === 'admin',
    delete: ({ req }) => (req.user as UserLike)?.userType === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Stakeholder Map',
      admin: { description: 'Title shown on the dashboard card (e.g. "Stakeholder Map – Acme Corp")' },
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      required: true,
      admin: { description: 'Company this stakeholder map is for' },
    },
    {
      name: 'stakeholders',
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description: 'Stakeholders to place on the map. Add rows for each person; name is required.',
      },
      fields: [
        { name: 'name', type: 'text', required: true, admin: { description: 'Stakeholder name' } },
        { name: 'title', type: 'text', admin: { description: 'Job title or role (optional)' } },
        {
          name: 'notes',
          type: 'textarea',
          admin: { description: 'Facilitator-facing notes; not shown to the user' },
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Inactive activities are hidden from assignment lists' },
    },
  ],
  timestamps: true,
}
