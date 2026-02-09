import { downloadDataselectorController } from '~/src/server/download_dataselector/controller.js'

/**
 * Sets up the routes used in the customdataset page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const downloadDataselector = {
  plugin: {
    name: 'downloadDataselector',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/download_dataselector',
          ...downloadDataselectorController
        },
        {
          method: 'GET',
          path: '/download_dataselector',
          ...downloadDataselectorController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
