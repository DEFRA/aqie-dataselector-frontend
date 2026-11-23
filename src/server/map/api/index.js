import { config } from '~/src/config/config.js'
import {
  getAurnData,
  getForecasts,
  getMonitoringStationInfo,
  getMonitoringStations
} from '~/src/server/map/api/back-end.js'

const HTTP_INTERNAL_SERVER_ERROR = 500

function proxy(fetchData, failureMessage) {
  return {
    async handler(request, h) {
      try {
        return h.response(await fetchData())
      } catch (error) {
        request.logger.error(error)
        return h
          .response({ message: failureMessage })
          .code(HTTP_INTERNAL_SERVER_ERROR)
      }
    }
  }
}

const UPSTREAM_FAILED = 'Failed to fetch data from upstream API'

// Until the forecast API is live, answer with no forecasts rather than a 500
function getForecastsIfEnabled() {
  return config.get('featureFlags.mapForecasts') ? getForecasts() : []
}

/**
 * JSON endpoints the map's client code calls.
 */
const mapApi = {
  plugin: {
    name: 'mapApi',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/api/monitoring-stations',
          ...proxy(getMonitoringStations, UPSTREAM_FAILED)
        },
        {
          method: 'GET',
          path: '/api/monitoring-station-info',
          ...proxy(getMonitoringStationInfo, UPSTREAM_FAILED)
        },
        {
          method: 'GET',
          path: '/api/forecasts',
          ...proxy(getForecastsIfEnabled, UPSTREAM_FAILED)
        },
        {
          method: 'GET',
          path: '/api/aurn-data',
          ...proxy(getAurnData, UPSTREAM_FAILED)
        }
      ])
    }
  }
}

export { mapApi }
