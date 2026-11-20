import Hapi from '@hapi/hapi'
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
})
