import type { CollectionConfig } from 'payload'

type UserLike = { userType?: string }

/** Minimum chip budget so N audiences can each get at least 1 chip with all unique values: 1+2+...+N = N(N+1)/2 */
function minChipBudgetForAudiences(n: number): number {
  return n < 2 ? 1 : (n * (n + 1)) / 2
}

export const AudiencePokerActivities: CollectionConfig = {
  slug: 'audience-poker-activities',
  admin: {
    group: 'Apps',
    useAsTitle: 'title',
    defaultColumns: ['title', 'chipBudget', 'updatedAt'],
    description: 'Audience Poker activities: users allocate a chip budget across audiences (unique allocations, no ties).',
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
      admin: { description: 'Activity title shown to the user' },
    },
    {
      name: 'instructions',
      type: 'richText',
      admin: { description: 'Instructions shown above the chip allocation UI' },
    },
    {
      name: 'chipBudget',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        description:
          'Total chips the user must allocate across all audiences. Minimum for N audiences is N(N+1)/2 (e.g. 3 audiences = 6, 5 = 15).',
      },
    },
    {
      name: 'audiences',
      type: 'array',
      required: true,
      minRows: 2,
      admin: { description: 'Audiences the user must allocate chips to (each gets ≥1, all values unique)' },
      fields: [
        { name: 'label', type: 'text', required: true, admin: { description: 'Audience label' } },
        { name: 'description', type: 'textarea', admin: { description: 'Optional description' } },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Whether this activity is available', position: 'sidebar' },
    },
  ],
  timestamps: true,
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.audiences && Array.isArray(data.audiences) && typeof data.chipBudget === 'number') {
          const n = data.audiences.length
          const minBudget = minChipBudgetForAudiences(n)
          if (data.chipBudget < minBudget) {
            throw new Error(
              `Chip budget ${data.chipBudget} is too low for ${n} audiences. Minimum is ${minBudget} (each audience ≥1, all values unique).`,
            )
          }
        }
        return data
      },
    ],
  },
}
