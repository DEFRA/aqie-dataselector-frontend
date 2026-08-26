/* eslint-disable prettier/prettier */

import { isSafeRedirect } from '~/src/server/common/helpers/is-safe-redirect.js'
import { english } from '~/src/server/data/en/homecontent.js'

const CONSENT_COOKIE_NAME = 'cookies_policy'
const CONSENT_COOKIE_VERSION = 1

const cookiesController = {
  handler: (request, h) => {
    const {
      footer: {
        cookies: {
          pageTitle,
          title,
          headings,
          heading,
          table1,
          table2,
          paragraphs
        }
      }
    } = english

    let analyticsConsented = false
    try {
      const raw = request.state[CONSENT_COOKIE_NAME]
      if (raw) {
        analyticsConsented = JSON.parse(raw).analytics === true
      }
    } catch {
      // malformed cookie — default to false
    }

    return h.view('cookies/index', {
      pageTitle,
      title,
      headings,
      heading,
      table1,
      table2,
      paragraphs,
      analyticsConsented
    })
  }
}

const cookiesPostController = {
  handler: (request, h) => {
    const { analytics, returnUrl } = request.payload ?? {}

    const analyticsAllowed = analytics === true || analytics === 'true'

    h.state(
      CONSENT_COOKIE_NAME,
      JSON.stringify({ analytics: analyticsAllowed, version: CONSENT_COOKIE_VERSION })
    )

    if (isSafeRedirect(returnUrl)) {
      return h.redirect(returnUrl)
    }

    return h.redirect('/cookies?updated=true')
  }
}

export { cookiesController, cookiesPostController }
