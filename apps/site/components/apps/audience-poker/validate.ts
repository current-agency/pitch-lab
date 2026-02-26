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
