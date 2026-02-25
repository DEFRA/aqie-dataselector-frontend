import { verifyController } from '~/src/server/verify/controller.js'

/**
 * Sets up the routes for verification endpoint.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const downloadEmailreq = {
  plugin: {
    name: 'downloadEmailreq',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/download_emailreq/{id}/{timestamp}',
          ...verifyController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
