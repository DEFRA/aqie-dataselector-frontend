import { datasourceController } from '~/src/server/datasource/controller.js'

/**
 * Sets up the routes used in the customdataset page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const datasource = {
  plugin: {
    name: 'datasource',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/datasource',
          ...datasourceController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
