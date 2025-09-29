import { homeControllerOld } from '~/src/server/home_old/controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const home = {
  plugin: {
    name: 'home_old',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...homeControllerOld
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
