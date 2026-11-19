import { config } from '~/src/config/config.js'
import { router } from '~/src/server/router.js'
import { map } from '~/src/server/map/index.js'

describe('router map registration', () => {
  const registered = async (enabled) => {
    config.set('featureFlags.mapInDataselector', enabled)
    const server = { register: jest.fn().mockResolvedValue() }
    await router.plugin.register(server)
    return server.register.mock.calls.flat(2)
  }

  afterEach(() => config.set('featureFlags.mapInDataselector', false))

  it('does not register the map when the flag is off', async () => {
    expect(await registered(false)).not.toContain(map)
  })

  it('registers the map when the flag is on', async () => {
    expect(await registered(true)).toContain(map)
  })
})
