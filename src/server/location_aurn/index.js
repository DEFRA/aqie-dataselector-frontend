import { locationaurnController } from '~/src/server/location_aurn/controller.js'

/**
 * Sets up the routes used in the customdataset page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const locationaurn = {
  plugin: {
    name: 'locationaurn',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/location-aurn',
          ...locationaurnController
        },
        {
          method: 'POST',
          path: '/location-aurn',
          ...locationaurnController
        },
        {
          method: 'GET',
          path: '/location-aurn/nojs',
          ...locationaurnController
        },
        {
          method: 'POST',
          path: '/location-aurn/nojs',
          ...locationaurnController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
