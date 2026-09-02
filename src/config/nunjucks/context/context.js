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

const GTM_KEY_PATTERN = /^GTM-[A-Z0-9]+$/

function getConsentPolicy(request) {
  try {
    const raw = request.state?.cookies_policy
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function hasValidConsent(request) {
  const policy = getConsentPolicy(request)
  return policy?.confirmed === true
}

function analyticsAccepted(request) {
  const policy = getConsentPolicy(request)
  return policy?.confirmed === true && policy?.analytics === true
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
    // Only render GTM when analytics consent has been given
    showGtm: analyticsAccepted(request),
    googleTagManagerKeys: config
      .get('googleAnalytics.googleTagManagerKeys')
      .split(',')
      .map((k) => k.trim())
      .filter((k) => GTM_KEY_PATTERN.test(k)),
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
