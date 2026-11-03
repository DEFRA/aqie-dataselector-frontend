import {
  stationDetailsController,
  last7DaysController,
  graphSummaryController
} from '~/src/server/stationdetails/controller.js'
import { config } from '~/src/config/config.js'

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
      path: '/stationdetails/last-7-days',
      ...last7DaysController
    },
    {
      method: 'GET',
      path: '/stationdetails/download/{download}/{pollutant}/{frequency}',
      ...stationDetailsController
    }
  ])

  if (config.get('featureFlags.viewGraphSummary')) {
    server.route({
      method: 'GET',
      path: '/stationdetails/graph-summary',
      ...graphSummaryController
    })
  }
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
