import path from 'node:path'
import { config } from '~/src/config/config.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'

const HSTS_MAX_AGE_SECONDS = 31536000 // 1 year

/**
 * Returns the Hapi server configuration options.
 * @returns {import('@hapi/hapi').ServerOptions}
 */
function createServerOptions() {
  return {
    port: config.get('port'),
    routes: {
      validate: { options: { abortEarly: false } },
      files: { relativeTo: path.resolve(config.get('root'), '.public') },
      security: {
        hsts: {
          maxAge: HSTS_MAX_AGE_SECONDS,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: { stripTrailingSlash: true },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(
          /** @type {Engine} */ (config.get('session.cache.engine'))
        )
      }
    ],
    state: { strictHeader: false }
  }
}

export { createServerOptions }

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
