import type { CollectionConfig } from 'payload'

type UserLike = { userType?: string }

export const StakeholderMapActivities: CollectionConfig = {
  slug: 'stakeholder-map-activities',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'company', 'isActive', 'updatedAt'],
    description:
      'Stakeholder Map activities: assign to users so they can map stakeholders by influence and interest for a specific company.',
  },
  access: {
    create: ({ req }) => (req.user as UserLike)?.userType === 'admin',
    read: () => true,
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
      admin: { description: 'Company whose stakeholders the user will map' },
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
