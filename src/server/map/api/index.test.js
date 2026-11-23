import Hapi from '@hapi/hapi'
import { config } from '~/src/config/config.js'
import { mapApi } from '~/src/server/map/api/index.js'
import * as backEnd from '~/src/server/map/api/back-end.js'

jest.mock('~/src/server/map/api/back-end.js')

const routes = [
  ['/api/monitoring-stations', 'getMonitoringStations'],
  ['/api/monitoring-station-info', 'getMonitoringStationInfo'],
  ['/api/forecasts', 'getForecasts'],
  ['/api/aurn-data', 'getAurnData']
]

describe('map api routes', () => {
  let server

  beforeEach(async () => {
    jest.clearAllMocks()
    config.set('featureFlags.mapForecasts', true)
    server = Hapi.server()
    server.decorate('request', 'logger', () => ({ error: jest.fn() }), {
      apply: true
    })
    await server.register(mapApi)
  })

  it.each(routes)('%s returns the upstream data', async (url, fn) => {
    backEnd[fn].mockResolvedValue({ ok: true })
    const res = await server.inject(url)
    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({ ok: true })
  })

  it.each(routes)('%s returns 500 when upstream fails', async (url, fn) => {
    backEnd[fn].mockRejectedValue(new Error('boom'))
    const res = await server.inject(url)
    expect(res.statusCode).toBe(500)
    expect(res.result).toEqual({
      message: 'Failed to fetch data from upstream API'
    })
  })

  it('/api/forecasts returns no forecasts without calling upstream while the flag is off', async () => {
    config.set('featureFlags.mapForecasts', false)
    const res = await server.inject('/api/forecasts')
    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual([])
    expect(backEnd.getForecasts).not.toHaveBeenCalled()
  })

  afterAll(() => config.set('featureFlags.mapForecasts', false))
})
