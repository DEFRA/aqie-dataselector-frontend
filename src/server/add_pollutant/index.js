import { airpollutantController } from '~/src/server/add_pollutant/controller.js'

/**
 * Sets up the routes used in the airpollutant page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const airpollutant = {
  plugin: {
    name: 'airpollutant',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/airpollutant',
          ...airpollutantController
        },
        {
          method: 'GET',
          path: '/airpollutant/nojs',
          ...airpollutantController
        },
        {
          method: 'POST',
          path: '/addpollutants',
          ...airpollutantController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
