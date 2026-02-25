import type { CollectionConfig } from 'payload'

const SECTION_OPTIONS = [
  { label: 'Content Complexity', value: 'content-complexity' },
  { label: 'Editor Autonomy', value: 'editor-autonomy' },
  { label: 'Marketing Personalization', value: 'marketing-personalization' },
  { label: 'Integration Ecosystem', value: 'integration-ecosystem' },
  { label: 'Team Resources', value: 'team-resources' },
  { label: 'Scale & Performance', value: 'scale-performance' },
  { label: 'Budget & Timeline', value: 'budget-timeline' },
  { label: 'Future Vision', value: 'future-vision' },
  { label: 'Day in the Life', value: 'day-in-the-life' },
  { label: 'Workflow Builder', value: 'workflow-builder' },
  { label: 'Who Does What', value: 'who-does-what' },
  { label: 'Current Platform Assessment', value: 'current-platform' },
  { label: 'Future State Wishlist', value: 'future-state-wishlist' },
] as const

const INPUT_TYPE_OPTIONS = [
  { label: 'Multi-select', value: 'multi-select' },
  { label: 'Single-select', value: 'single-select' },
  { label: 'Rating scale', value: 'rating-scale' },
  { label: 'Ranking', value: 'ranking' },
  { label: 'Text input', value: 'text-input' },
  { label: 'Pain level with meta', value: 'pain-level-with-meta' },
  { label: 'Matrix', value: 'matrix' },
] as const

function sectionSortIndex(section: string): number {
  const i = SECTION_OPTIONS.findIndex((o) => o.value === section)
  return i === -1 ? 999 : i
}

export const PlatformSurveyQuestions: CollectionConfig = {
  slug: 'platform-survey-questions',
  defaultSort: ['sectionSortOrder', 'order'],
  admin: {
    useAsTitle: 'questionKey',
    defaultColumns: ['section', 'order', 'questionKey', 'inputType', 'isActive'],
    description: 'Platform Fit Quiz questions. Ordered by section then order.',
  },
  access: {
    create: ({ req }) => Boolean((req.user as { userType?: string })?.userType === 'admin'),
    read: () => true,
    update: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
    delete: ({ req }) => (req.user as { userType?: string })?.userType === 'admin',
  },
  fields: [
    {
      name: 'section',
      type: 'select',
      required: true,
      options: [...SECTION_OPTIONS],
      admin: { description: 'Section this question belongs to. Section labels are fixed; editors can only add questions to existing sections.' },
    },
    {
      name: 'sectionSortOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Used for list ordering (section order, then order within section).',
        readOnly: true,
        hidden: true,
      },
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'Sort order within the section' },
    },
    {
      name: 'inputType',
      type: 'select',
      required: true,
      options: [...INPUT_TYPE_OPTIONS],
      admin: {
        description: 'Choose the question type first. The form will show only the fields needed for this type.',
        position: 'sidebar',
      },
    },
    {
      name: 'questionKey',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Slug-style identifier (e.g. content-types, technical-comfort)' },
    },
    {
      name: 'questionText',
      type: 'textarea',
      required: true,
      admin: { description: 'The question text' },
    },
    {
      name: 'helpText',
      type: 'textarea',
      admin: { description: 'Optional subtitle/clarifying copy under the question' },
    },
    {
      name: 'options',
      type: 'array',
      admin: {
        description: 'Choices (multi/single-select, ranking) or row labels (matrix). Use hasTextInput for "Other, describe: ___".',
        condition: (_data, siblingData) => {
          const t = siblingData?.inputType as string | undefined
          return t === 'multi-select' || t === 'single-select' || t === 'ranking' || t === 'matrix'
        },
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'hasTextInput', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      admin: {
        description: 'Column labels for the matrix (one selection per row).',
        condition: (_data, siblingData) => siblingData?.inputType === 'matrix',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
    {
      name: 'ratingMin',
      type: 'number',
      defaultValue: 1,
      admin: {
        description: 'Minimum value (e.g. 1).',
        condition: (_data, siblingData) => siblingData?.inputType === 'rating-scale',
      },
    },
    {
      name: 'ratingMax',
      type: 'number',
      defaultValue: 5,
      admin: {
        description: 'Maximum value (e.g. 5).',
        condition: (_data, siblingData) => siblingData?.inputType === 'rating-scale',
      },
    },
    {
      name: 'ratingLabels',
      type: 'group',
      admin: {
        description: 'Labels at the low and high end of the scale.',
        condition: (_data, siblingData) => siblingData?.inputType === 'rating-scale',
      },
      fields: [
        { name: 'minLabel', type: 'text' },
        { name: 'maxLabel', type: 'text' },
      ],
    },
    {
      name: 'required',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Whether the question must be answered' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Hide question without deleting' },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.section != null) {
          data.sectionSortOrder = sectionSortIndex(data.section as string)
        }
        return data
      },
    ],
  },
  timestamps: true,
}
