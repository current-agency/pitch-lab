import crypto from 'crypto'
import type { CollectionConfig } from 'payload'

/** Decisions map: groupKey -> { client_decision, notes } */
export type MigrationSessionDecisions = Record<
  string,
  { client_decision: string; notes: string }
>

export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('base64url')
}

export const MigrationReviewSession: CollectionConfig = {
  slug: 'migration-review-sessions',
  admin: {
    group: 'Submissions & Responses',
    useAsTitle: 'email',
    defaultColumns: ['email', 'dataVersion', 'updatedAt'],
    description: 'Content Migration Analyzer review sessions tied to email',
  },
  access: {
    create: () => false, // Only via migration-session API (overrideAccess)
    read: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    update: () => false, // Only via migration-session API (overrideAccess)
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      admin: { description: 'Email address for this review session' },
    },
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: 'Unique session ID (used to resume session)',
      },
    },
    {
      name: 'dataVersion',
      type: 'text',
      admin: { description: 'Migration data version (e.g. FINAL, v2)' },
    },
    {
      name: 'decisions',
      type: 'json',
      admin: {
        description: 'Saved decisions: groupKey -> { client_decision, notes }',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (data && operation === 'create' && !data.sessionId) {
          data.sessionId = generateSessionId()
        }
        return data
      },
    ],
  },
  timestamps: true,
}
