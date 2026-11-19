import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  mapController,
  nearbyStationsMapController
} from '~/src/server/map/controller.js'
import { nearbyStationsPayloadSchema } from '~/src/server/map/schema.js'
import { mapContentSecurityPolicy } from '~/src/server/map/content-security-policy.js'
import { mapApi } from '~/src/server/map/api/index.js'

// The payload is a few short fields, so cap it well below hapi's 1MB default.
const MAX_PAYLOAD_BYTES = 1024

const dirname = path.dirname(fileURLToPath(import.meta.url))
const interactiveMapPath = path.resolve(
  dirname,
  '../../../node_modules/@defra/interactive-map'
)

/**
 * The air quality map. Only registered when featureFlags.mapInDataselector is on.
 */
const map = {
  plugin: {
    name: 'map',
    async register(server) {
      const plugins = { blankie: mapContentSecurityPolicy }

      server.route([
        {
          method: 'GET',
          path: '/map',
          options: { plugins },
          ...mapController
        },
        {
          method: 'POST',
          path: '/map/view',
          options: {
            plugins,
            payload: { maxBytes: MAX_PAYLOAD_BYTES },
            validate: {
              payload: nearbyStationsPayloadSchema,
              // Bad input still gets a working map, just at the default view
              failAction: (_request, h) => h.redirect('/map').takeover()
            }
          },
          ...nearbyStationsMapController
        },
        {
          method: 'GET',
          path: '/map-assets/{param*}',
          options: { auth: false },
          handler: {
            directory: { path: interactiveMapPath, redirectToSlash: true }
          }
        }
      ])

      await server.register([mapApi])
    }
  }
}

export { map }
