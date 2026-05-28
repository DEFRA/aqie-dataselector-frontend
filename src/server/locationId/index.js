import { getLocationDetailsController } from '~/src/server/locationId/controller.js'

// Define the route configuration function
const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/location',
      ...getLocationDetailsController
    },
    {
      method: 'POST',
      path: '/location',
      ...getLocationDetailsController
    }
  ])
}

// Define the plugin
const locationId = {
  plugin: {
    name: 'location{id}',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { locationId, configureRoutes }
