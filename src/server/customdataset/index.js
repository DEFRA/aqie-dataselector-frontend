import { customdatasetController } from '~/src/server/customdataset/controller.js'

/**
 * Sets up the routes used in the customdataset page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const customdataset = {
  plugin: {
    name: 'customdataset',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/customdataset',
          ...customdatasetController
        },
        {
          method: 'GET',
          path: '/customdataset/{pollutants}',
          ...customdatasetController
        },
        {
          method: 'GET',
          path: '/customdataset/year/{year}',
          ...customdatasetController
        },
        {
          method: 'POST',
          path: '/customdataset/location',
          ...customdatasetController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
