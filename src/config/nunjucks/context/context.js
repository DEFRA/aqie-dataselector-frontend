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

/* Keep in sync with CONSENT_COOKIE_NAME in cookie-functions.js */
const CONSENT_COOKIE_NAME = 'airaqie_cookies_analytics'

/**
 * Read the analytics consent decision from the request cookie.
 *
 * Used to decide whether to render the GTM <noscript> fallback, which is the
 * only analytics tag we cannot gate client side. Defaults to false so nothing
 * is rendered until the user has actively accepted.
 * @param {import('@hapi/hapi').Request | null} [request] - Current request
 * @returns {boolean} True if the user has accepted analytics cookies
 */
function hasAnalyticsConsent(request) {
  const consentCookie = request?.state?.[CONSENT_COOKIE_NAME]

  if (!consentCookie) {
    return false
  }

  try {
    const consent =
      typeof consentCookie === 'string'
        ? JSON.parse(consentCookie)
        : consentCookie
    return consent?.analytics === true
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
    navigation: buildNavigation(request),
    analyticsConsent: hasAnalyticsConsent(request),
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      const normalizedAssetPath =
        webpackAssetPath?.replace(/^\/public\/images\//, 'assets/images/') ??
        asset
      return `${assetPath}/${normalizedAssetPath}`
    }
  }
}
