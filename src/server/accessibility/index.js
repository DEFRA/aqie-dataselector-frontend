import { accessibilityController } from '~/src/server/accessibility/controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const accessibility = {
  plugin: {
    name: 'accessibility',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/accessibility',
          ...accessibilityController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
