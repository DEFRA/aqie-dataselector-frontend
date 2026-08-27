import {
  cookiesController,
  cookiesPostController
} from '~/src/server/cookies/controller.js'
import { config } from '~/src/config/config.js'
import { ONE_YEAR_MS } from '~/src/server/common/constants/magic-numbers.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const cookies = {
  plugin: {
    name: 'cookies',
    register(server) {
      // isHttpOnly must be false — client JS reads this cookie directly
      server.state('cookies_policy', {
        ttl: ONE_YEAR_MS,
        isSameSite: 'Lax',
        isSecure: config.get('isProduction'),
        isHttpOnly: false,
        encoding: 'none',
        strictHeader: false
      })

      server.route([
        {
          method: 'GET',
          path: '/cookies',
          ...cookiesController
        },
        {
          method: 'POST',
          path: '/cookies',
          ...cookiesPostController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
