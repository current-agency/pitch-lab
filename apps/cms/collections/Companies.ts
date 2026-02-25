import type { CollectionConfig } from 'payload'

export const Companies: CollectionConfig = {
  slug: 'companies',
  access: {
    read: () => true,
    create: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'platformSurveyEnabled', 'updatedAt'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Company name',
      },
    },
    {
      name: 'platformSurveyEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When enabled, this company is assigned the Platform Fit Quiz. Users can take the survey via a link with ?company=<this company id>. The company name is shown as the survey title.',
      },
    },
  ],
  timestamps: true,
}
