import path from 'node:path'
import hapi from '@hapi/hapi'
import crumb from '@hapi/crumb'
import { config } from '~/src/config/config.js'
import { nunjucksConfig } from '~/src/config/nunjucks/nunjucks.js'
import { router } from './router.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { sessionCache } from '~/src/server/common/helpers/session-cache/session-cache.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'
import { requestTracing } from '~/src/server/common/helpers/request-tracing.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'

export async function createServer() {
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(
          /** @type {Engine} */ (config.get('session.cache.engine'))
        )
      }
    ],
    state: {
      strictHeader: false
    }
  })

  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    // crumb must be registered before nunjucksConfig so its onPreResponse injects
    // the token into the view context before Vision renders the template.
    // skip only applies to POST validation — GET requests always generate a token
    // so {{ crumb }} is available in the cookie banner on every page.
    {
      plugin: crumb,
      options: {
        skip: (request) =>
          request.method === 'post' && request.path !== '/cookies',
        cookieOptions: { isSecure: config.get('isProduction') }
      }
    },
    nunjucksConfig,
    router
  ])

  server.ext('onPreResponse', (request, h) => {
    const response = request.response
    if (response.isBoom) {
      return h.continue
    }

    // Server-side GA cookie removal — expires GA cookies for users who have not
    // consented (covers no-JS users where client-side deletion never runs)
    const GA_COOKIE_REGEX = /^_ga$|^_ga_.*$|^_gid$|^_gat_.*$|^_dc_gtm_.*$/
    try {
      const raw = request.state?.['cookies_policy']
      if (raw) {
        const policy = JSON.parse(raw)
        if (policy?.analytics !== true && policy?.version >= 1) {
          for (const cookieName of Object.keys(request.state)) {
            if (GA_COOKIE_REGEX.test(cookieName)) {
              h.unstate(cookieName)
            }
          }
        }
      }
    } catch {
      // malformed consent cookie — skip
    }

    response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.header(
      'Content-Security-Policy',
      "style-src 'self'; img-src 'self'; frame-ancestors 'none'"
    )
    return h.continue
  })

  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
