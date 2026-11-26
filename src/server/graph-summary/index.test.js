import hapi from '@hapi/hapi'
import { config } from '~/src/config/config.js'
import { configureRoutes } from '~/src/server/graph-summary/index.js'

const STATION = {
  id: 'BirminghamA4540Roadside',
  name: 'Birmingham A4540 Roadside'
}
const PATH = '/stationdetails/graph-summary'

// A real Hapi server, so the route's own validation runs. Only the view and the
// session are stubbed: the view echoes what the controller asked to render, and
// the session is one store shared by every request, like a single user's.
async function buildServer() {
  const server = hapi.server()
  const session = new Map([
    ['MonitoringstResult', { getmonitoringstation: [STATION] }]
  ])
  server.decorate('toolkit', 'view', function (template, context) {
    return this.response({ template, context })
  })
  server.decorate(
    'request',
    'yar',
    () => ({
      get: (key) => session.get(key),
      set: (key, value) => session.set(key, value)
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

  const post = (fields) =>
    server.inject({
      method: 'POST',
      url: PATH,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams(fields).toString()
    })

  it('redirects a posted station and period to the page, keeping them out of the URL', async () => {
    const response = await post({ stationId: STATION.id, period: 'last7days' })

    expect(response.statusCode).toBe(303)
    expect(response.headers.location).toBe(PATH)
  })

  it('renders the posted station and period', async () => {
    await post({ stationId: STATION.id, period: 'last7days' })
    const response = await server.inject(PATH)

    expect(response.statusCode).toBe(200)
    expect(response.result.template).toBe('graph-summary/index')
    expect(response.result.context.heading).toBe(
      'Last 7 days: Birmingham A4540 Roadside'
    )
  })

  it('opens on the last 24 hours when no period is posted', async () => {
    await post({ stationId: STATION.id })
    const response = await server.inject(PATH)

    expect(response.result.context.heading).toBe(
      'Last 24 hours: Birmingham A4540 Roadside'
    )
  })

  it('keeps the station when switching period', async () => {
    await post({ stationId: STATION.id, period: 'last24hours' })
    await post({ stationId: STATION.id, period: 'last7days' })
    const response = await server.inject(PATH)

    expect(response.result.context.heading).toBe(
      'Last 7 days: Birmingham A4540 Roadside'
    )
  })

  it('returns Back to the station page tab it was opened from', async () => {
    await post({
      stationId: STATION.id,
      period: 'last7days',
      from: 'last7days'
    })
    const response = await server.inject(PATH)

    expect(response.result.context.hrefq).toBe('/stationdetails/last-7-days')
  })

  it('ignores fields it does not know about', async () => {
    const response = await post({ stationId: STATION.id, nojs: 'true' })

    expect(response.statusCode).toBe(303)
  })

  it.each([
    ['an unknown period', { stationId: STATION.id, period: 'last30days' }],
    ['no station id', { period: 'last24hours' }],
    ['an empty station id', { stationId: '' }],
    ['an over-long station id', { stationId: 'a'.repeat(201) }],
    ['a station the user has not searched for', { stationId: 'SomewhereElse' }]
  ])('renders the not found page for %s', async (_name, fields) => {
    const response = await post(fields)

    expect(response.statusCode).toBe(404)
    expect(response.result.template).toBe('error/index')
  })

  it('renders the not found page when nothing has been posted', async () => {
    const response = await server.inject(PATH)

    expect(response.statusCode).toBe(404)
    expect(response.result.template).toBe('error/index')
  })

  it('no longer takes the station and period from the query string', async () => {
    const response = await server.inject(
      `${PATH}?stationId=${STATION.id}&period=last7days`
    )

    expect(response.statusCode).toBe(404)
  })

  it('is not available when the feature flag is off', async () => {
    config.set('featureFlags.viewGraphSummary', false)
    const disabledServer = await buildServer()

    const response = await disabledServer.inject({
      method: 'POST',
      url: PATH,
      payload: { stationId: STATION.id }
    })
    await disabledServer.stop()

    expect(response.statusCode).toBe(404)
    expect(response.result.template).toBeUndefined()
  })
})
