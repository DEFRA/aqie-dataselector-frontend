import { searchLocationController } from '~/src/server/search-location/controller.js'

export const searchLocation = {
  plugin: {
    name: 'search-location',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/search-location',
          ...searchLocationController
        }
      ])
    }
  }
}
