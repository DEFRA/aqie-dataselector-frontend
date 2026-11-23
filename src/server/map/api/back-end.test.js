import { request } from 'undici'
import { config } from '~/src/config/config.js'
import {
  getAurnData,
  getForecasts,
  getMonitoringStationInfo,
  getMonitoringStations
} from '~/src/server/map/api/back-end.js'

jest.mock('undici')

const reply = (statusCode, json = {}) => ({
  statusCode,
  body: { json: () => Promise.resolve(json), dump: jest.fn() }
})

describe('map back-end helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    config.set('aqieBackEnd.url', 'http://backend')
    config.set('aqieForecastApi.url', null)
    request.mockResolvedValue(reply(200, { data: 1 }))
  })

  it.each([
    [getMonitoringStations, 'http://backend/monitoringStations'],
    [getMonitoringStationInfo, 'http://backend/monitoringStationInfo'],
    [getAurnData, 'http://backend/aurnData'],
    [getForecasts, 'http://backend/forecasts']
  ])('calls the back-end', async (fn, url) => {
    await expect(fn()).resolves.toEqual({ data: 1 })
    expect(request).toHaveBeenCalledWith(url, expect.any(Object))
  })

  it('uses the forecast API when configured', async () => {
    config.set('aqieForecastApi.url', 'http://forecast')
    await getForecasts()
    expect(request).toHaveBeenCalledWith(
      'http://forecast/forecast',
      expect.any(Object)
    )
  })

  it('gives station info a longer timeout', async () => {
    await getMonitoringStationInfo()
    expect(request.mock.calls[0][1].headersTimeout).toBe(120000)
  })

  it('throws on a non-200 response', async () => {
    request.mockResolvedValue(reply(503))
    await expect(getAurnData()).rejects.toThrow('responded 503')
  })

  it('throws when the base URL is missing', async () => {
    config.set('aqieBackEnd.url', '')
    await expect(getAurnData()).rejects.toThrow('Missing base URL')
  })
})
