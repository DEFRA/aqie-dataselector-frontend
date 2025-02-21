import { privacyController } from '~/src/server/privacy/controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const privacy = {
  plugin: {
    name: 'privacy',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/privacy',
          ...privacyController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
