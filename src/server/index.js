import path from 'path'
import hapi from '@hapi/hapi'
import hapiCookie from '@hapi/cookie'
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

const isProduction = config.get('isProduction')

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
  await server.register([hapiCookie])
  const cookiePassword = config.get('cookiePassword')
  server.auth.strategy('login', 'cookie', {
    cookie: {
      name: 'airaqie_cookies_analytics_session',
      path: '/',
      password: cookiePassword,
      isSecure: isProduction
    },
    redirectTo: '/',
    keepAlive: true,
    // to validate cookie content on each request and returns boolean(isauthenticated/not)
    validate: (request, session) => {
      if (session.password === config.get('aqiePassword')) {
        return { isValid: true }
      } else {
        return { isValid: true }
      }
    }
  })

  server.auth.default({ strategy: 'login', mode: 'required' })

  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
