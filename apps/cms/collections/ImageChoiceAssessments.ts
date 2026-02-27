import type { CollectionConfig } from 'payload'

type UserLike = { userType?: string }

export const ImageChoiceAssessments: CollectionConfig = {
  slug: 'image-choice-assessments',
  admin: {
    group: 'Apps',
    useAsTitle: 'title',
    defaultColumns: ['title', 'duration', 'isActive', 'updatedAt'],
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
      admin: { description: 'Name of this image choice assessment' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional description of the assessment' },
    },
    {
      name: 'duration',
      type: 'number',
      required: true,
      defaultValue: 5,
      min: 1,
      max: 60,
      admin: { description: 'Time in seconds for each image pair' },
    },
    {
      name: 'imagePairs',
      type: 'array',
      required: true,
      minRows: 1,
      admin: { description: 'Pairs of images for users to choose between' },
      fields: [
        {
          name: 'pairTitle',
          type: 'text',
          admin: { description: 'Optional label for this pair (e.g., "Brand A vs Brand B")' },
        },
        {
          name: 'imageLeft',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: { description: 'Left image option' },
        },
        {
          name: 'imageRight',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: { description: 'Right image option' },
        },
        {
          name: 'question',
          type: 'text',
          admin: { description: 'Optional question to display with this pair' },
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this assessment is currently active',
        position: 'sidebar',
      },
    },
    {
      name: 'instructions',
      type: 'richText',
      admin: { description: 'Instructions shown to users before starting' },
    },
  ],
  timestamps: true,
}
