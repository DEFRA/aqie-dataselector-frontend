// The map library needs blob workers, vector tiles and inline styles, so the map
// routes get their own policy instead of the site-wide one.
const mapContentSecurityPolicy = {
  defaultSrc: ['self'],
  fontSrc: ['self', 'data:'],
  connectSrc: [
    'self',
    'data:',
    'https://tiles.openfreemap.org',
    'https://www.google.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com'
  ],
  mediaSrc: ['self'],
  styleSrc: [
    'self',
    "'sha256-2PZQPqAcY6IE7H879XiZ2Hm3cBUNVB41T1m3kjNvN6E='",
    "'sha256-2xbtINjVlLJj9ZoLtUvIDOoIknefI75gHwbH8jYZ+6E='"
  ],
  scriptSrc: [
    'self',
    'blob:',
    "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
    'https://www.googletagmanager.com'
  ],
  workerSrc: ['self', 'blob:'],
  imgSrc: ['self', 'data:', 'https://tiles.openfreemap.org'],
  frameSrc: ['self', 'data:'],
  objectSrc: ['none'],
  frameAncestors: ['self'],
  formAction: ['self'],
  manifestSrc: ['self'],
  generateNonces: true
}

export { mapContentSecurityPolicy }
