import { config } from '~/src/config/config.js'
import { configureRoutes } from '~/src/server/stationdetails/index.js'

const GRAPH_SUMMARY_PATH = '/stationdetails/graph-summary'

describe('stationdetails routes', () => {
  const originalFlag = config.get('featureFlags.viewGraphSummary')

  function registeredRoutes() {
    const server = { route: jest.fn() }
    configureRoutes(server)
    return server.route.mock.calls.flatMap(([routes]) => routes)
  }

  afterEach(() => {
    config.set('featureFlags.viewGraphSummary', originalFlag)
  })

  it('does not register the graph summary page when the feature flag is off', () => {
    config.set('featureFlags.viewGraphSummary', false)

    const paths = registeredRoutes().map(({ path }) => path)

    expect(paths).toContain('/stationdetails')
    expect(paths).not.toContain(GRAPH_SUMMARY_PATH)
  })

  it('registers the graph summary page when the feature flag is on', () => {
    config.set('featureFlags.viewGraphSummary', true)

    const route = registeredRoutes().find(
      ({ path }) => path === GRAPH_SUMMARY_PATH
    )

    expect(route).toEqual(
      expect.objectContaining({ method: 'GET', handler: expect.any(Function) })
    )
  })
})
