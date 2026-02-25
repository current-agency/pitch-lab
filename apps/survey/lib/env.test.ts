import { describe, it, expect, afterEach } from 'vitest'
import { requireEnv } from './env'

describe('requireEnv', () => {
  const orig = process.env.CMS_URL

  afterEach(() => {
    if (orig !== undefined) process.env.CMS_URL = orig
    else delete process.env.CMS_URL
  })

  it('returns trimmed value when set', () => {
    process.env.CMS_URL = '  http://localhost:3001  '
    expect(requireEnv('CMS_URL')).toBe('http://localhost:3001')
  })

  it('throws with clear message when unset', () => {
    delete process.env.CMS_URL
    expect(() => requireEnv('CMS_URL')).toThrow(/CMS_URL is required/)
  })

  it('throws when empty string', () => {
    process.env.CMS_URL = ''
    expect(() => requireEnv('CMS_URL')).toThrow(/CMS_URL is required/)
  })
})
