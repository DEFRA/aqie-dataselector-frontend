import { stationDetailsNojsController } from '~/src/server/stationDetailsNojs/controller.js'

// Define the route configuration function
const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/stationDetailsNojs/{id}',
      ...stationDetailsNojsController
    },
    {
      method: 'GET',
      path: '/stationDetailsNojs/year/{year}',
      ...stationDetailsNojsController
    },
    {
      method: 'GET',
      path: '/stationdetails/download/{pollutant}/{frequency}',
      ...stationDetailsNojsController
    }
  ])
}

// Define the plugin
const stationDetailsNojs = {
  plugin: {
    name: 'stationDetailsNojs{id}',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { stationDetailsNojs, configureRoutes }
