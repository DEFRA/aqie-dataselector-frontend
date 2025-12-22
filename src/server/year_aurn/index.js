import { yearController } from '~/src/server/year_aurn/controller.js'

/**
 * Sets up the routes used in the customdataset page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const year = {
  plugin: {
    name: 'year',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/year-aurn',
          ...yearController
        },
        {
          method: 'POST',
          path: '/year-aurn',
          ...yearController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
