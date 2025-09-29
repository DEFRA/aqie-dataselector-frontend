import { hubController } from '~/src/server/hubpage/controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const hubPage = {
  plugin: {
    name: 'hubPage',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/hubpage',
          ...hubController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
