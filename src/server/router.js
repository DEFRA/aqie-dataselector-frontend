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
import { stationDetailsNojs } from '~/src/server/stationDetailsNojs/index.js'
import { serveStaticFiles } from '~/src/server/common/helpers/serve-static-files.js'
import { about } from '~/src/server/about/index.js'
import { locationId } from '~/src/server/locationId/index.js'
import path from 'path'
import { yearId } from '~/src/server/year_pollutiondetails/index.js'
import { renderTable } from '~/src/server/renderTable/index.js'
import { download } from '~/src/server/download/index.js'
import { hubPage } from '~/src/server/hubpage/index.js'
import { customdataset } from '~/src/server/customdataset/index.js'
import { airpollutant } from '~/src/server/add_pollutant/index.js'
import { datasource } from '~/src/server/datasource/index.js'
import { year } from '~/src/server/year_aurn/index.js'
import { locationaurn } from '~/src/server/location_aurn/index.js'
import { downloadDataselector } from '~/src/server/download_dataselector/index.js'
import { downloadAurn } from '~/src/server/download_aurn/index.js'
import { emailrequest } from '~/src/server/emailrequest/index.js'
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
        yearId,
        renderTable,
        download,
        stationDetailsNojs,
        hubPage,
        customdataset,
        airpollutant,
        datasource,
        year,
        locationaurn,
        downloadDataselector,
        downloadAurn,
        emailrequest
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
