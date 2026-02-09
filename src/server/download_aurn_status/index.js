// import { downloadAurnController } from '~/src/server/download_aurn/controller.js'
import { downloadAurnstatusController } from '~/src/server/download_aurn_status/controller.js'

const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/download_aurn_status/{jobID}',
      ...downloadAurnstatusController
    }
  ])
}

const downloadAurnstatus = {
  plugin: {
    name: 'downloadAurnstatus',
    register: (server) => {
      configureRoutes(server)
    }
  }
}
export { downloadAurnstatus, configureRoutes }
