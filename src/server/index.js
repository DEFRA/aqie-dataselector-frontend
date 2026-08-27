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
import { onPreResponse } from '~/src/server/common/helpers/on-pre-response.js'
import { createServerOptions } from '~/src/server/common/helpers/server-options.js'

export async function createServer() {
  const server = hapi.server(createServerOptions())

  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    // crumb before nunjucksConfig ensures the token is in view context before Vision renders
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

  server.ext('onPreResponse', onPreResponse)
  server.ext('onPreResponse', catchAll)

  return server
}
