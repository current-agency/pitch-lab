import type { CollectionConfig } from 'payload'
import type { Where } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200, // 2 hours
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
    depth: 1, // Include company in JWT so content-rank read access works for client-users
  },
  admin: {
    group: 'Admin',
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'userType', 'company', 'assignedApplications'],
  },
  access: {
    admin: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    create: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    read: ({ req }): boolean | Where => {
      const user = req.user as { userType?: string; id?: string } | null
      if (user?.userType === 'admin') return true
      if (user?.id) return { id: { equals: user.id } } as Where
      return false
    },
    update: ({ req }): boolean | Where => {
      const user = req.user as { userType?: string; id?: string } | null
      if (user?.userType === 'admin') return true
      if (user?.id) return { id: { equals: user.id } } as Where
      return false
    },
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
      admin: {
        description: "User's first name",
      },
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      admin: {
        description: "User's last name",
      },
    },
    {
      name: 'userType',
      type: 'select',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Client User', value: 'client-user' },
      ],
      defaultValue: 'client-user',
      admin: {
        description: "User's role in the system",
      },
      access: {
        update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
      },
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      required: true,
      admin: {
        description: 'The company this user belongs to',
      },
      access: {
        update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
        create: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
      },
    },
    {
      name: 'assignedApplications',
      type: 'relationship',
      relationTo: ['image-choice-assessments', 'audience-poker-activities', 'stakeholder-map-activities'],
      hasMany: true,
      admin: {
        description: 'Activities this user can access: Image choice, Audience Poker, Stakeholder Map. Only admins can edit.',
      },
      access: {
        read: ({ req, doc }) => {
          const user = req.user as { userType?: string; id?: string }
          if (user?.userType === 'admin') return true
          if (user?.id && doc && typeof doc === 'object' && 'id' in doc && (doc as { id: string }).id === user.id)
            return true
          return false
        },
        create: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
        update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
      },
    },
    {
      name: 'platformSurveyEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When enabled, this user sees the Platform Fit Quiz (survey) on their dashboard. There is only one survey; no need to create instances.',
      },
      access: {
        update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
        create: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this user account is active',
      },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Last time user logged in',
      },
    },
    {
      name: 'activityResets',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: './components/UserActivityResetField#UserActivityResetField',
        },
      },
    },
  ],
  hooks: {
    // Run before validation so required fields are preserved when admin sends empty values
    beforeValidate: [
      ({ data, operation, originalDoc }) => {
        if (!data || operation !== 'update' || !originalDoc) return data
        const doc = originalDoc as { firstName?: string; lastName?: string; company?: string | { id: string } }
        // Preserve required fields when empty so validation passes
        if (data.firstName === '' || data.firstName == null) data.firstName = doc.firstName
        if (data.lastName === '' || data.lastName == null) data.lastName = doc.lastName
        const existingCompany = doc.company
        const companyId =
          typeof existingCompany === 'object' && existingCompany !== null
            ? (existingCompany as { id: string }).id
            : existingCompany
        if (data.company === '' || data.company == null || !data.company) data.company = companyId
        // Normalize company: object with id -> id string
        if (data.company != null && typeof data.company === 'object' && 'id' in data.company) {
          data.company = (data.company as { id: string }).id
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (!data) return data
        // Don't update password if empty (admin form often sends empty when not changing)
        if (operation === 'update' && 'password' in data && (data as { password?: string }).password === '') {
          delete (data as { password?: string }).password
        }
        // Normalize company again for DB write
        if (data.company != null && typeof data.company === 'object' && 'id' in data.company) {
          data.company = (data.company as { id: string }).id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const userId = typeof doc?.id === 'string' ? doc.id : (doc as { id?: string })?.id
        if (!userId || !req?.payload) return

        const newCompanyId =
          typeof doc.company === 'object' && doc.company !== null && 'id' in doc.company
            ? (doc.company as { id: string }).id
            : typeof doc.company === 'string'
              ? doc.company
              : null
        const prevCompanyId =
          previousDoc &&
          (typeof (previousDoc as { company?: string | { id: string } }).company === 'object' &&
          (previousDoc as { company?: { id: string } }).company !== null
            ? ((previousDoc as { company: { id: string } }).company?.id ?? null)
            : typeof (previousDoc as { company?: string } | null)?.company === 'string'
              ? (previousDoc as { company: string }).company
              : null)

        const removeFromCompany = async (companyId: string) => {
          const company = await req.payload.findByID({
            collection: 'companies',
            id: companyId,
            depth: 0,
            overrideAccess: true,
          }) as { users?: string[] } | null
          if (!company?.users || !Array.isArray(company.users)) return
          const next = (company.users as string[]).filter((id) => id !== userId)
          if (next.length !== company.users.length) {
            await req.payload.update({
              collection: 'companies',
              id: companyId,
              data: { users: next },
              overrideAccess: true,
            })
          }
        }

        const addToCompany = async (companyId: string) => {
          const company = await req.payload.findByID({
            collection: 'companies',
            id: companyId,
            depth: 0,
            overrideAccess: true,
          }) as { users?: string[] } | null
          const current = Array.isArray(company?.users) ? (company.users as string[]) : []
          if (current.includes(userId)) return
          await req.payload.update({
            collection: 'companies',
            id: companyId,
            data: { users: [...current, userId] },
            overrideAccess: true,
          })
        }

        if (prevCompanyId && prevCompanyId !== newCompanyId) {
          await removeFromCompany(prevCompanyId)
        }
        if (newCompanyId) {
          await addToCompany(newCompanyId)
        }
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: { lastLoginAt: new Date().toISOString() },
        })
      },
    ],
  },
  timestamps: true,
}
