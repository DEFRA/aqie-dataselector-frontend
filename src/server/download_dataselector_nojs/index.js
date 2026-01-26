import { downloadDataselectornojsController } from '~/src/server/download_dataselector_nojs/controller.js'

/**
 * Sets up the routes used in the customdataset page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const downloadDataselectornojs = {
  plugin: {
    name: 'downloadDataselectornojs',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/download_dataselectornojs',
          ...downloadDataselectornojsController
        },
        {
          method: 'POST',
          path: '/download_dataselectornojs',
          ...downloadDataselectornojsController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
