import { stationSummaryController } from '~/src/server/station-summary/controller.js'

const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/station-summary',
      ...stationSummaryController
    }
  ])
}

const stationSummary = {
  plugin: {
    name: 'station-summary',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { stationSummary, configureRoutes }
