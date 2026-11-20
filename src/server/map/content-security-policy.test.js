import { contentSecurityPolicy } from '~/src/server/common/helpers/content-security-policy.js'
import { mapContentSecurityPolicy } from '~/src/server/map/content-security-policy.js'

describe('map content security policy', () => {
  const site = contentSecurityPolicy.options

  it('keeps everything the site-wide policy allows for scripts and connections', () => {
    expect(mapContentSecurityPolicy.scriptSrc).toEqual(
      expect.arrayContaining(site.scriptSrc)
    )
    expect(mapContentSecurityPolicy.connectSrc).toEqual(
      expect.arrayContaining(site.connectSrc)
    )
  })

  it('adds tiles, blob workers and generated nonces', () => {
    expect(mapContentSecurityPolicy.connectSrc).toContain(
      'https://tiles.openfreemap.org'
    )
    expect(mapContentSecurityPolicy.workerSrc).toContain('blob:')
    expect(mapContentSecurityPolicy.generateNonces).toBe(true)
  })

  it('does not allow unsafe-inline styles or other form targets', () => {
    expect(mapContentSecurityPolicy.styleSrc).not.toContain("'unsafe-inline'")
    expect(mapContentSecurityPolicy.formAction).toEqual(['self'])
  })
})
