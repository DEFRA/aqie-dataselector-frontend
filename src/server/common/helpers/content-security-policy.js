// Content Security Policy (CSP) using Blankie for GA4/GTM support.
// Generates nonces for inline scripts (more secure than 'unsafe-inline').

import Blankie from 'blankie'
import { cspDirectives } from '~/src/server/common/constants/csp-directives.js'

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
      cspDirectives.gaAnalytics
    ],
    styleSrc: [cspDirectives.self],
    connectSrc: [
      cspDirectives.self,
      cspDirectives.googleDomain,
      cspDirectives.gaAnalytics,
      cspDirectives.gaAnalyticsAlt,
      cspDirectives.gaTagmanager
    ],
    frameSrc: [cspDirectives.gaTagmanager],
    frameAncestors: [cspDirectives.self],
    formAction: [cspDirectives.self],
    manifestSrc: [cspDirectives.self],
    generateNonces: true
  }
}
