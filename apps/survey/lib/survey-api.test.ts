import { describe, it, expect } from 'vitest'
import { buildConfigUrl } from './survey-api'

describe('buildConfigUrl', () => {
  it('builds URL with encoded company id', () => {
    expect(buildConfigUrl('http://localhost:3001', 'company-123')).toBe(
      'http://localhost:3001/api/platform-survey-config?company=company-123'
    )
  })

  it('strips trailing slash from base URL', () => {
    expect(buildConfigUrl('http://localhost:3001/', 'abc')).toBe(
      'http://localhost:3001/api/platform-survey-config?company=abc'
    )
  })

  it('encodes company id for query string', () => {
    expect(buildConfigUrl('https://cms.example.com', 'co 1&2')).toBe(
      'https://cms.example.com/api/platform-survey-config?company=co%201%262'
    )
  })
})
