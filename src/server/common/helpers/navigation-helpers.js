/**
 * Shared navigation/referer helpers used to guard routes that should only be
 * reached via internal navigation, plus the standard 404 page renderer.
 */

import { english } from '~/src/server/data/en/homecontent.js'
import { HTTP_NOT_FOUND } from '~/src/server/common/constants/magic-numbers.js'

// Check if the request is coming from within the application (valid referer
// pointing at the same host or localhost).
export function isInternalNavigation(request) {
  const referer = request.headers.referer || request.headers.referrer || ''
  const host = request.info.host || ''
  return Boolean(
    referer && (referer.includes(host) || referer.includes('localhost'))
  )
}

// Render the standard "Page not found" 404 view.
export function renderNotFound(h) {
  return h
    .view('error/index', {
      pageTitle: 'Page not found',
      heading: 'Page not found',
      statusCode: '404',
      content: english.errorpages,
      message:
        'If you typed the web address, check it is correct. If you pasted the web address, check you copied the entire address.'
    })
    .code(HTTP_NOT_FOUND)
}
