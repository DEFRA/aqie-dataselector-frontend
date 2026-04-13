import { stationcountUkeapController } from '~/src/server/stationcount_ukeap/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const stationcountUkeap = {
  plugin: {
    name: 'stationcountUkeap',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/stationcount_ukeap',
          ...stationcountUkeapController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
