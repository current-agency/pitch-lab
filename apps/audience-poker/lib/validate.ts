export type ValidationResult = {
  totalSpent: number
  chipsRemaining: number
  errors: {
    unspentChips: boolean
    zeroAllocation: boolean
    duplicateValues: boolean
  }
  canSubmit: boolean
}

/**
 * Validates chip allocations against the rules:
 * - Every audience must receive at least 1 chip
 * - No two audiences can receive the same number of chips
 * - All chips must be fully spent (total === chipBudget)
 */
export function validate(allocations: number[], chipBudget: number): ValidationResult {
  const total = allocations.reduce((sum, n) => sum + n, 0)
  const hasZero = allocations.some((n) => n < 1)
  const hasDuplicates = new Set(allocations).size !== allocations.length

  return {
    totalSpent: total,
    chipsRemaining: chipBudget - total,
    errors: {
      unspentChips: total !== chipBudget,
      zeroAllocation: hasZero,
      duplicateValues: hasDuplicates,
    },
    canSubmit: total === chipBudget && !hasZero && !hasDuplicates,
  }
}
