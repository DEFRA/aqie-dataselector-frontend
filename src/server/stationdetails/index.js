import { stationDetailsController } from '~/src/server/stationdetails/controller.js'

// Define the route configuration function
const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/stationdetails',
      ...stationDetailsController
    },
    {
      method: 'POST',
      path: '/stationdetails',
      ...stationDetailsController
    },
    {
      method: 'GET',
      path: '/stationdetails/year/{year}',
      ...stationDetailsController
    },
    {
      method: 'GET',
      path: '/stationdetails/download/{download}/{pollutant}/{frequency}',
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
