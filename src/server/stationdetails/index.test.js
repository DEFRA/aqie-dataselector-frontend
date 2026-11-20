import { config } from '~/src/config/config.js'
import { configureRoutes } from '~/src/server/stationdetails/index.js'

const DAQI_PATH = '/stationdetails/daqi'

describe('stationdetails routes', () => {
  const originalDaqiFlag = config.get('featureFlags.viewDaqiTab')

  function registeredRoutes() {
    const server = { route: jest.fn() }
    configureRoutes(server)
    return server.route.mock.calls.flatMap(([routes]) => routes)
  }

  afterEach(() => {
    config.set('featureFlags.viewDaqiTab', originalDaqiFlag)
  })

  it('does not register the DAQI page when the DAQI tab flag is off', () => {
    config.set('featureFlags.viewDaqiTab', false)

    const paths = registeredRoutes().map(({ path }) => path)

    expect(paths).toContain('/stationdetails')
    expect(paths).not.toContain(DAQI_PATH)
  })

  it('registers the DAQI page when the DAQI tab flag is on', () => {
    config.set('featureFlags.viewDaqiTab', true)

    expect(registeredRoutes().map(({ path }) => path)).toContain(DAQI_PATH)
  })

  it('registers the Last 24 hours page whatever the DAQI tab flag', () => {
    config.set('featureFlags.viewDaqiTab', false)

    expect(registeredRoutes().map(({ path }) => path)).toContain(
      '/stationdetails/last-24-hours'
    )
  })
})
