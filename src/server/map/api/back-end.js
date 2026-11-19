import { request } from 'undici'
import { config } from '~/src/config/config.js'

const DEFAULT_TIMEOUT_MS = 5000
const STATION_INFO_TIMEOUT_MS = 120000
const HTTP_OK = 200

async function getJson(baseUrl, path, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!baseUrl) {
    throw new Error(`Missing base URL for ${path}`)
  }

  const url = new URL(path, baseUrl).toString()
  const { statusCode, body } = await request(url, {
    method: 'GET',
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs
  })

  if (statusCode !== HTTP_OK) {
    await body.dump()
    throw new Error(`${url} responded ${statusCode}`)
  }

  return body.json()
}

const getMonitoringStations = () =>
  getJson(config.get('aqieBackEnd.url'), '/monitoringStations')

const getMonitoringStationInfo = () =>
  getJson(
    config.get('aqieBackEnd.url'),
    '/monitoringStationInfo',
    STATION_INFO_TIMEOUT_MS
  )

const getAurnData = () => getJson(config.get('aqieBackEnd.url'), '/aurnData')

const getForecasts = () => {
  const forecastApiUrl = config.get('aqieForecastApi.url')
  return forecastApiUrl
    ? getJson(forecastApiUrl, '/forecast')
    : getJson(config.get('aqieBackEnd.url'), '/forecasts')
}

export {
  getMonitoringStations,
  getMonitoringStationInfo,
  getAurnData,
  getForecasts
}
