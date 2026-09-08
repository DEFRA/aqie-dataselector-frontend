// Content Security Policy (CSP) using Blankie for GA4/GTM support.
// Generates nonces for inline scripts (more secure than 'unsafe-inline').

import Blankie from 'blankie'

export const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    fontSrc: ['self'],
    imgSrc: ['self', 'https://*.googletagmanager.com', 'https://*.google-analytics.com'],
    scriptSrc: [
      'self',
      'https://*.googletagmanager.com',
      'https://*.google-analytics.com'
    ],
    styleSrc: ['self'],
    connectSrc: [
      'self',
      'https://www.google.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com'
    ],
    frameSrc: ['https://www.googletagmanager.com'],
    frameAncestors: ['self'],
    formAction: ['self'],
    manifestSrc: ['self'],
    generateNonces: true
  }
}
