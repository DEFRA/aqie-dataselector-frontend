// Content Security Policy (CSP) using Blankie for GA4/GTM support.
// Generates nonces for inline scripts (more secure than 'unsafe-inline').

import Blankie from 'blankie'
import { config } from '~/src/config/config.js'
import { cspDirectives } from '~/src/server/common/constants/csp-directives.js'
import { getMapsFrontEndBaseUrl } from '~/src/server/common/helpers/map-url.js'

// The station page's "View map of nearby monitoring stations" form posts to
// aqie-maps-frontend, unless the map is served by the dataselector itself
const mapsFrontEndUrl = config.get('featureFlags.mapInDataselector')
  ? null
  : getMapsFrontEndBaseUrl()

export const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    fontSrc: [cspDirectives.self],
    imgSrc: [
      cspDirectives.self,
      cspDirectives.gaTagmanager,
      cspDirectives.gaAnalytics
    ],
    scriptSrc: [
      cspDirectives.self,
      cspDirectives.gaTagmanager,
      cspDirectives.gaAnalytics,
      'https://code.jquery.com',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"
      // sha256 hash for GOV.UK's inline script: document.body.className += ...
      // This allows the GOV.UK template script to execute without nonce
    ],
    styleSrc: [cspDirectives.self, "'unsafe-inline'"],
    connectSrc: [
      cspDirectives.self,
      cspDirectives.googleDomain,
      cspDirectives.gaAnalytics,
      cspDirectives.gaAnalyticsAlt,
      cspDirectives.gaTagmanager
    ],
    frameSrc: [cspDirectives.gaTagmanager],
    frameAncestors: [cspDirectives.self],
    formAction: mapsFrontEndUrl
      ? [cspDirectives.self, mapsFrontEndUrl]
      : [cspDirectives.self],
    manifestSrc: [cspDirectives.self],
    generateNonces: true
  }
}
