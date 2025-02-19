import { stationDetailsController } from '~/src/server/stationdetails/controller.js'

// Define the route configuration function
const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/stationdetails/{id}',
      ...stationDetailsController
    }
  ])
}

// Define the plugin
const stationDetails = {
  plugin: {
    name: 'stationdetails{id}',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { stationDetails, configureRoutes }
