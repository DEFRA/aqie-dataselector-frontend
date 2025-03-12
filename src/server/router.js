import inert from '@hapi/inert'
import { fileURLToPath } from 'node:url'
import { health } from '~/src/server/health/index.js'
import { home } from '~/src/server/home/index.js'

import { privacy } from '~/src/server/privacy/index.js'
import { cookies } from '~/src/server/cookies/index.js'
import { accessibility } from '~/src/server/accessibility/index.js'
import { searchLocation } from '~/src/server/search-location/index.js'
import { multiplelocations } from '~/src/server/multiplelocations/index.js'
import { monitoringStation } from '~/src/server/monitoring-station/index.js'
import { stationDetails } from '~/src/server/stationdetails/index.js'
import { serveStaticFiles } from '~/src/server/common/helpers/serve-static-files.js'
import { about } from '~/src/server/about/index.js'
import { locationId } from '~/src/server/locationId/index.js'
import path from 'path'
import { yearId } from '~/src/server/year_pollutiondetails/index.js'
/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
export const moj = {
  plugin: {
    name: 'moj',
    register(server) {
      server.route({
        method: 'GET',
        path: '/assets/{param*}',
        handler: {
          directory: {
            path: path.join(
              dirname,
              'node_modules/@ministryofjustice/frontend/moj/assets'
            ),
            redirectToSlash: true,
            index: false
          }
        }
      })
    }
  }
}
export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([
        home,
        about,
        privacy,
        accessibility,
        cookies,
        searchLocation,
        multiplelocations,
        monitoringStation,
        stationDetails,
        locationId,
        moj,
        yearId
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
