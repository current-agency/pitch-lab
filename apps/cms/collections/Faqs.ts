import type { CollectionConfig } from 'payload'

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: {
    singular: 'FAQ',
    plural: 'FAQs',
  },
  admin: {
    group: 'Admin',
    useAsTitle: 'question',
    defaultColumns: ['question', 'order', 'updatedAt'],
    description: 'Frequently asked questions shown on the dashboard FAQs page.',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean((req.user as { userType?: string })?.userType === 'admin'),
    update: ({ req }) => Boolean((req.user as { userType?: string })?.userType === 'admin'),
    delete: ({ req }) => Boolean((req.user as { userType?: string })?.userType === 'admin'),
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
      admin: { description: 'The question text' },
    },
    {
      name: 'answer',
      type: 'textarea',
      required: true,
      admin: { description: 'The answer text' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Sort order (lower = first)' },
    },
  ],
  timestamps: true,
}
