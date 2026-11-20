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

// Read on each call rather than at import, so config changes are picked up
function getBackEndJson(path, timeoutMs) {
  return getJson(config.get('aqieBackEnd.url'), path, timeoutMs)
}

function getMonitoringStations() {
  return getBackEndJson('/monitoringStations')
}

function getMonitoringStationInfo() {
  return getBackEndJson('/monitoringStationInfo', STATION_INFO_TIMEOUT_MS)
}

function getAurnData() {
  return getBackEndJson('/aurnData')
}

function getForecasts() {
  const forecastApiUrl = config.get('aqieForecastApi.url')
  return forecastApiUrl
    ? getJson(forecastApiUrl, '/forecast')
    : getBackEndJson('/forecasts')
}

export {
  getMonitoringStations,
  getMonitoringStationInfo,
  getAurnData,
  getForecasts
}
