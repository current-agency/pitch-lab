import type { CollectionConfig } from 'payload'

export const Stakeholders: CollectionConfig = {
  slug: 'stakeholders',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'title', 'company', 'updatedAt'],
    description: 'Stakeholders for the Stakeholder Map exercise. Link to a company.',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      const secret = process.env.STAKEHOLDER_MAP_API_SECRET
      if (secret && req.headers?.get?.('x-stakeholder-map-secret') === secret) return true
      return false
    },
    create: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Stakeholder name' },
    },
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Job title or role (optional)' },
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      required: true,
      admin: { description: 'Company this stakeholder belongs to' },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Facilitator-facing notes; not shown to the client user',
      },
    },
  ],
  timestamps: true,
}
