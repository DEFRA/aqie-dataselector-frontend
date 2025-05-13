import path from 'path'
import hapi from '@hapi/hapi'
import hapiCookie from '@hapi/cookie'
import { config } from '~/src/config/index.js'
import { nunjucksConfig } from '~/src/config/nunjucks/nunjucks.js'
import { router } from './router.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { sessionCache } from '~/src/server/common/helpers/session-cache/session-cache.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'
import { requestTracing } from '~/src/server/common/helpers/request-tracing.js'

// function catchAll(request, h) {
//   const { response } = request

//   if (!response.isBoom) {
//     response.header(
//       'Strict-Transport-Security',
//       'max-age=31536000; includeSubDomains'
//     )
//     response.header('X-Content-Type-Options', 'nosniff')
//     response.header('X-Frame-Options', 'DENY')
//     response.header('X-XSS-Protection', '1; mode=block')
//     response.header('Referrer-Policy', 'no-referrer')
//     response.header(
//       'Content-Security-Policy',
//       "default-src 'self' 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' 'sha256-r5X1+PpkARiIVqqcQ0RDzcx7PYvuO6QoyiWpRaUuS2M=' 'sha256-W+lIm8NzGKSAA+hPYBnTTi9FPX4RS+5f+vn77dO32ko=' 'sha256-pvukEGssf3w6u5+mxgVHnbiZCYAGJG7vMcjE29hkcKs='  https://www.googletagmanager.com; connect-src 'self' https://region1.google-analytics.com  https://www.googletagmanager.com; script-src 'self' 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' 'sha256-r5X1+PpkARiIVqqcQ0RDzcx7PYvuO6QoyiWpRaUuS2M=' 'sha256-W+lIm8NzGKSAA+hPYBnTTi9FPX4RS+5f+vn77dO32ko=' 'sha256-pvukEGssf3w6u5+mxgVHnbiZCYAGJG7vMcjE29hkcKs='  https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'"
//     )
//     // COOP (Cross-Origin Opener Policy)
//     response.header('Cross-Origin-Opener-Policy', 'same-origin')

//     // COEP (Cross-Origin Embedder Policy)
//     response.header('Cross-Origin-Embedder-Policy', 'require-corp')

//     // CORP (Cross-Origin Resource Policy)
//     response.header('Cross-Origin-Resource-Policy', 'cross-origin')

//     return h.continue
//   }
//   request.logger.info(response)
//   request.logger.info(response?.stack)
//   // return  response.output
//   return h.redirect(
//     '/problem-with-service?statusCode=' +
//       response.output.statusCode
//   )
// }

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
