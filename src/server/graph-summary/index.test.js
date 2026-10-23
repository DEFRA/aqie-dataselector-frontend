import hapi from '@hapi/hapi'
import { config } from '~/src/config/config.js'
import { configureRoutes } from '~/src/server/graph-summary/index.js'

const STATION = {
  id: 'BirminghamA4540Roadside',
  name: 'Birmingham A4540 Roadside'
}
const PATH = '/stationdetails/graph-summary'

// A real Hapi server, so the route's own validation runs. Only the view and the
// session are stubbed: the view echoes what the controller asked to render.
async function buildServer() {
  const server = hapi.server()
  server.decorate('toolkit', 'view', function (template, context) {
    return this.response({ template, context })
  })
  server.decorate(
    'request',
    'yar',
    () => ({
      get: (key) =>
        key === 'MonitoringstResult'
          ? { getmonitoringstation: [STATION] }
          : undefined,
      set: jest.fn()
    }),
    { apply: true }
  )
  configureRoutes(server)
  await server.initialize()
  return server
}

describe('graph summary route', () => {
  let server

  beforeEach(async () => {
    config.set('featureFlags.viewGraphSummary', true)
    server = await buildServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  it('renders the page for a station and period', async () => {
    const response = await server.inject(
      `${PATH}?stationId=${STATION.id}&period=last7days`
    )

    expect(response.statusCode).toBe(200)
    expect(response.result.template).toBe('graph-summary/index')
    expect(response.result.context.heading).toBe(
      'Last 7 days: Birmingham A4540 Roadside'
    )
  })

  it('opens on the last 24 hours when no period is given', async () => {
    const response = await server.inject(`${PATH}?stationId=${STATION.id}`)

    expect(response.statusCode).toBe(200)
    expect(response.result.context.heading).toBe(
      'Last 24 hours: Birmingham A4540 Roadside'
    )
  })

  it('reads the no-JavaScript flag', async () => {
    const response = await server.inject(
      `${PATH}?stationId=${STATION.id}&nojs=true`
    )

    expect(response.result.context.hrefq).toBe(
      '/stationDetailsNojs/BirminghamA4540Roadside'
    )
  })

  it('ignores query parameters it does not know about', async () => {
    const response = await server.inject(
      `${PATH}?stationId=${STATION.id}&utm_source=somewhere`
    )

    expect(response.statusCode).toBe(200)
  })

  it.each([
    ['an unknown period', `stationId=${STATION.id}&period=last30days`],
    ['no station id', 'period=last24hours'],
    ['an empty station id', 'stationId='],
    ['an over-long station id', `stationId=${'a'.repeat(201)}`],
    ['a malformed no-JavaScript flag', `stationId=${STATION.id}&nojs=maybe`],
    ['a station the user has not searched for', 'stationId=SomewhereElse']
  ])('renders the not found page for %s', async (_name, query) => {
    const response = await server.inject(`${PATH}?${query}`)

    expect(response.statusCode).toBe(404)
    expect(response.result.template).toBe('error/index')
  })

  it('is not available when the feature flag is off', async () => {
    config.set('featureFlags.viewGraphSummary', false)
    const disabledServer = await buildServer()

    const response = await disabledServer.inject(
      `${PATH}?stationId=${STATION.id}`
    )
    await disabledServer.stop()

    expect(response.statusCode).toBe(404)
    expect(response.result.template).toBeUndefined()
  })
})
