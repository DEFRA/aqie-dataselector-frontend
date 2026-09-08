import { isSafeRedirect } from './is-safe-redirect.js'

describe('isSafeRedirect', () => {
  it('returns true for a root-relative path', () => {
    expect(isSafeRedirect('/')).toBe(true)
  })

  it('returns true for a deeper relative path with query string', () => {
    expect(isSafeRedirect('/cookies?updated=true')).toBe(true)
  })

  it('returns true for any relative path', () => {
    expect(isSafeRedirect('/some/page')).toBe(true)
  })

  it('returns false for an absolute URL', () => {
    expect(isSafeRedirect('https://evil.example.com')).toBe(false)
  })

  it('returns false for a protocol-relative URL', () => {
    expect(isSafeRedirect('//evil.example.com')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSafeRedirect(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSafeRedirect(undefined)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isSafeRedirect('')).toBe(false)
  })

  it('returns false for a non-string value', () => {
    expect(isSafeRedirect(123)).toBe(false)
  })
})
