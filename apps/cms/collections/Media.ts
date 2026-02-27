import path from 'path'
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Admin',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    // Absolute path so mkdir works regardless of cwd. In production (e.g. Vercel) use BLOB_READ_WRITE_TOKEN so the Vercel Blob plugin is used instead.
    staticDir: path.join(process.cwd(), 'media'),
    // image/* for Image Choice and general images; text/csv and application/csv for Content Rank (ScreamingFrog + GA4)
    mimeTypes: ['image/*', 'text/csv', 'application/csv', 'text/plain'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 1024, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: { description: 'Alt text for the image' },
    },
  ],
  timestamps: true,
}
