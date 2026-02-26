import { describe, it, expect } from 'vitest'
import { validate } from './validate'

describe('validate', () => {
  it('returns canSubmit true when all chips spent, no zeros, no duplicates', () => {
    const result = validate([1, 2, 3], 6)
    expect(result.totalSpent).toBe(6)
    expect(result.chipsRemaining).toBe(0)
    expect(result.errors.unspentChips).toBe(false)
    expect(result.errors.zeroAllocation).toBe(false)
    expect(result.errors.duplicateValues).toBe(false)
    expect(result.canSubmit).toBe(true)
  })

  it('returns canSubmit false when chips remaining', () => {
    const result = validate([1, 2, 3], 10)
    expect(result.totalSpent).toBe(6)
    expect(result.chipsRemaining).toBe(4)
    expect(result.errors.unspentChips).toBe(true)
    expect(result.canSubmit).toBe(false)
  })

  it('returns canSubmit false when over budget', () => {
    const result = validate([5, 5], 8)
    expect(result.totalSpent).toBe(10)
    expect(result.chipsRemaining).toBe(-2)
    expect(result.errors.unspentChips).toBe(true)
    expect(result.canSubmit).toBe(false)
  })

  it('returns canSubmit false when any allocation is zero', () => {
    const result = validate([0, 2, 4], 6)
    expect(result.errors.zeroAllocation).toBe(true)
    expect(result.canSubmit).toBe(false)
  })

  it('returns canSubmit false when allocations have duplicates', () => {
    const result = validate([2, 2, 2], 6)
    expect(result.errors.duplicateValues).toBe(true)
    expect(result.canSubmit).toBe(false)
  })

  it('handles two audiences', () => {
    const result = validate([1, 2], 3)
    expect(result.canSubmit).toBe(true)
    expect(result.chipsRemaining).toBe(0)
  })

  it('handles single-audience edge case', () => {
    const result = validate([5], 5)
    expect(result.canSubmit).toBe(true)
  })
})
