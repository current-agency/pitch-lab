import crypto from 'crypto'
import type { CollectionConfig } from 'payload'
import type { Where } from 'payload'

type UserLike = { userType?: string }

function generateAccessToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export const ContentRank: CollectionConfig = {
  slug: 'content-rank',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'company', 'updatedAt'],
  },
  access: {
    create: ({ req }) => (req.user as UserLike)?.userType === 'admin',
    read: ({ req }) => {
      const user = req.user as { userType?: string; company?: string | { id: string }; id?: string } | null
      if (user?.userType === 'admin') return true
      if (user?.company) {
        const companyId = typeof user.company === 'object' && user.company !== null ? (user.company as { id: string }).id : user.company
        if (companyId) return { company: { equals: companyId } } as Where
      }
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
      admin: { description: 'Name of this content rank instance' },
    },
    {
      name: 'screamingFrogCsv',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'ScreamingFrog crawl export (CSV)' },
    },
    {
      name: 'ga4Csv',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'GA4 report export (CSV)' },
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      required: true,
      admin: { description: 'Company this content rank is assigned to' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this instance is active',
        position: 'sidebar',
      },
    },
    {
      name: 'accessToken',
      type: 'text',
      admin: {
        description: 'Token for the Content Rank app to fetch this instance (without CMS login)',
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data && !data.accessToken) {
          data.accessToken = generateAccessToken()
        }
        return data
      },
    ],
  },
  timestamps: true,
}
