import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { buildNavigation } from '~/src/config/nunjucks/context/build-navigation.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

const CONSENT_COOKIE_VERSION = 1

function hasValidConsent(request) {
  try {
    const raw = request.state?.['cookies_policy']
    if (!raw) return false
    const policy = JSON.parse(raw)
    return !!(policy?.version >= CONSENT_COOKIE_VERSION)
  } catch {
    return false
  }
}

export function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
      webpackManifest = {}
    }
  }
  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    breadcrumbs: [],
    currentPath: request.url.pathname,
    // Server-side banner visibility — covers no-JS users where the inline script can't run
    showCookieBanner: !hasValidConsent(request) && request.path !== '/cookies',
    navigation: buildNavigation(request),
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      const normalizedAssetPath =
        webpackAssetPath?.replace(/^\/public\/images\//, 'assets/images/') ??
        asset
      return `${assetPath}/${normalizedAssetPath}`
    }
  }
}
