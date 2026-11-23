import Hapi from '@hapi/hapi'
import inert from '@hapi/inert'
import { map } from '~/src/server/map/index.js'
import { nearbyStationsPayloadSchema } from '~/src/server/map/schema.js'

jest.mock('~/src/server/map/api/index.js', () => ({
  mapApi: {
    plugin: { name: 'map-api', register: jest.fn() }
  }
}))

describe('map routes', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()
    server.decorate('toolkit', 'view', function (template, context) {
      return this.response({ template, context })
    })
    await server.register([inert, map])
  })

  afterEach(() => server.stop())

  it('renders the map at the default view', async () => {
    const res = await server.inject('/map')
    expect(res.statusCode).toBe(200)
    expect(res.result.template).toBe('map/index')
    expect(res.result.context).toEqual({
      pageTitle: 'Air quality map',
      dataSelectorUrl: '',
      nearbyStationsView: undefined
    })
  })

  it('opens the map on the posted station', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/map/view',
      payload: { lat: 51.5, lng: -0.1, siteId: 'ABC1', extra: 'dropped' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.result.context.nearbyStationsView).toEqual({
      center: [-0.1, 51.5],
      zoom: 11,
      selectedStationId: 'ms-ABC1'
    })
  })

  it('opens the map without a selected station when siteId is omitted', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/map/view',
      payload: { lat: 51.5, lng: -0.1 }
    })
    expect(
      res.result.context.nearbyStationsView.selectedStationId
    ).toBeUndefined()
  })

  it.each([
    { lat: 10, lng: -0.1 },
    { lat: 51.5, lng: 50 },
    { lng: -0.1 },
    { lat: 51.5, lng: -0.1, siteId: 'bad id!' }
  ])('redirects to /map for invalid payload %j', async (payload) => {
    const res = await server.inject({
      method: 'POST',
      url: '/map/view',
      payload
    })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/map')
  })

  it('rejects oversized payloads', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/map/view',
      payload: { lat: 51.5, lng: -0.1, siteId: 'x'.repeat(2000) }
    })
    expect(res.statusCode).toBe(413)
  })

  it('serves the interactive map assets without auth', async () => {
    const res = await server.inject('/map-assets/package.json')
    expect(res.statusCode).toBe(200)
  })
})

describe('nearbyStationsPayloadSchema', () => {
  it('strips unknown keys', () => {
    const { value } = nearbyStationsPayloadSchema.validate({
      lat: 51,
      lng: 0,
      other: 1
    })
    expect(value).toEqual({ lat: 51, lng: 0 })
  })
})
