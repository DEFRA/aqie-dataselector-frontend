import { multipleLocationsController } from '~/src/server/multiplelocations/controller.js'

export const multiplelocations = {
  plugin: {
    name: 'monitoringstations',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/multiplelocations',
          ...multipleLocationsController
        }
      ])
    }
  }
}
