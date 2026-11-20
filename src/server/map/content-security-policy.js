import { contentSecurityPolicy } from '~/src/server/common/helpers/content-security-policy.js'
import { cspDirectives } from '~/src/server/common/constants/csp-directives.js'

const siteWide = contentSecurityPolicy.options
const TILES = 'https://tiles.openfreemap.org'

// The site-wide policy, plus what the map library needs: vector tiles, blob
// workers, and the inline styles it injects (allowed by hash rather than
// 'unsafe-inline'). A route-level policy replaces the site-wide one, so it
// is built on top of it to avoid the two drifting apart.
const mapContentSecurityPolicy = {
  ...siteWide,
  defaultSrc: [cspDirectives.self],
  fontSrc: [...siteWide.fontSrc, 'data:'],
  connectSrc: [...siteWide.connectSrc, 'data:', TILES],
  imgSrc: [...siteWide.imgSrc, 'data:', TILES],
  scriptSrc: [...siteWide.scriptSrc, 'blob:'],
  workerSrc: [cspDirectives.self, 'blob:'],
  styleSrc: [
    cspDirectives.self,
    "'sha256-2PZQPqAcY6IE7H879XiZ2Hm3cBUNVB41T1m3kjNvN6E='",
    "'sha256-2xbtINjVlLJj9ZoLtUvIDOoIknefI75gHwbH8jYZ+6E='"
  ],
  frameSrc: [...siteWide.frameSrc, 'data:'],
  objectSrc: ['none'],
  formAction: [cspDirectives.self]
}

export { mapContentSecurityPolicy }
