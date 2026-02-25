import { describe, it, expect, afterEach } from 'vitest'
import { getCmsUrl, getErrorMessage, isLocalhost } from './login-helpers'

describe('getCmsUrl', () => {
  const orig = process.env.CMS_URL

  afterEach(() => {
    if (orig !== undefined) process.env.CMS_URL = orig
    else delete process.env.CMS_URL
  })

  it('strips trailing slash from CMS_URL', () => {
    process.env.CMS_URL = 'http://localhost:3001/'
    expect(getCmsUrl()).toBe('http://localhost:3001')
  })

  it('returns CMS_URL when no trailing slash', () => {
    process.env.CMS_URL = 'http://localhost:3001'
    expect(getCmsUrl()).toBe('http://localhost:3001')
  })

  it('defaults to http://localhost:3001 when CMS_URL unset', () => {
    delete process.env.CMS_URL
    expect(getCmsUrl()).toBe('http://localhost:3001')
  })
})

describe('isLocalhost', () => {
  it('returns true for http://localhost:3001', () => {
    expect(isLocalhost('http://localhost:3001')).toBe(true)
  })

  it('returns true for http://127.0.0.1', () => {
    expect(isLocalhost('http://127.0.0.1')).toBe(true)
  })

  it('returns false for https://example.com', () => {
    expect(isLocalhost('https://example.com')).toBe(false)
  })

  it('returns false for https://my-cms.vercel.app', () => {
    expect(isLocalhost('https://my-cms.vercel.app')).toBe(false)
  })
})

describe('getErrorMessage', () => {
  it('returns d.message when present', () => {
    expect(getErrorMessage({ message: 'Invalid credentials' })).toBe('Invalid credentials')
  })

  it('returns first error message from d.errors array', () => {
    expect(getErrorMessage({ errors: [{ message: 'Email is required' }] })).toBe('Email is required')
  })

  it('returns d.error when present', () => {
    expect(getErrorMessage({ error: 'Unauthorized' })).toBe('Unauthorized')
  })

  it('returns "Login failed" for empty object', () => {
    expect(getErrorMessage({})).toBe('Login failed')
  })

  it('returns "Login failed" for null/undefined', () => {
    expect(getErrorMessage(null)).toBe('Login failed')
    expect(getErrorMessage(undefined)).toBe('Login failed')
  })
})
