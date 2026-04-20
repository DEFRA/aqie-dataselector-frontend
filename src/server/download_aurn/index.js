import { downloadAurnController } from '~/src/server/download_aurn/controller.js'
import { downloadAurnstatusController } from '~/src/server/download_aurn_status/controller.js'

const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/download_aurn/{year}',
      ...downloadAurnController
    },
    {
      method: 'GET',
      path: '/download_aurn/{year}/{dataSource}',
      ...downloadAurnController
    },
    {
      method: 'GET',
      path: '/download_aurn/status/{jobID}',
      ...downloadAurnstatusController
    },
    {
      method: 'GET',
      path: '/download_aurn_nojs/{year}',
      ...downloadAurnController
    },
    {
      method: 'GET',
      path: '/download_aurn_nojs/{year}/{dataSource}',
      ...downloadAurnController
    }
  ])
}

const downloadAurn = {
  plugin: {
    name: 'downloadAurn',
    register: (server) => {
      configureRoutes(server)
    }
  }
}
export { downloadAurn, configureRoutes }
