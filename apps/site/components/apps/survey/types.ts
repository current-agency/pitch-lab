/** Option for select/ranking/matrix (and "other" with optional text). */
export type SurveyOption = {
  label: string
  value: string
  hasTextInput?: boolean
}

/** Column definition for matrix questions. */
export type SurveyColumn = { label: string; value: string }

export type SurveyQuestion = {
  id: string
  section: string
  sectionLabel: string
  order: number
  questionKey: string
  questionText: string
  helpText?: string | null
  inputType:
    | 'multi-select'
    | 'single-select'
    | 'rating-scale'
    | 'ranking'
    | 'text-input'
    | 'pain-level-with-meta'
    | 'matrix'
  options?: SurveyOption[] | null
  columns?: SurveyColumn[] | null
  ratingMin?: number | null
  ratingMax?: number | null
  ratingLabels?: { minLabel?: string | null; maxLabel?: string | null } | null
  required?: boolean | null
  isActive?: boolean | null
}

export type SurveySection = {
  section: string
  sectionLabel: string
  questions: SurveyQuestion[]
}

export type GroupedQuestionsResponse = {
  sections: SurveySection[]
}

/** Stored answer value: string, number, array, pain-meta object, or matrix row→column map. */
export type SurveyAnswerValue =
  | string
  | number
  | string[]
  | { pain?: number; frequency?: string; owner?: string; whatMakesHard?: string; notApplicable?: boolean }
  | Record<string, string>

/** Answers keyed by questionKey. */
export type SurveyAnswers = Record<string, SurveyAnswerValue>
