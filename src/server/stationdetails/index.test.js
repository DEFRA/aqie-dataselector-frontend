import { config } from '~/src/config/config.js'
import { configureRoutes } from '~/src/server/stationdetails/index.js'

const DAQI_PATH = '/stationdetails/daqi'

describe('stationdetails routes', () => {
  const originalFlag = config.get('featureFlags.viewDaqiTab')

  function registeredPaths() {
    const server = { route: jest.fn() }
    configureRoutes(server)
    return server.route.mock.calls
      .flatMap(([routes]) => routes)
      .map(({ path }) => path)
  }

  afterEach(() => {
    config.set('featureFlags.viewDaqiTab', originalFlag)
  })

  it('does not register the DAQI page when the DAQI tab flag is off', () => {
    config.set('featureFlags.viewDaqiTab', false)

    const paths = registeredPaths()

    expect(paths).toContain('/stationdetails')
    expect(paths).not.toContain(DAQI_PATH)
  })

  it('registers the DAQI page when the DAQI tab flag is on', () => {
    config.set('featureFlags.viewDaqiTab', true)

    expect(registeredPaths()).toContain(DAQI_PATH)
  })
})
