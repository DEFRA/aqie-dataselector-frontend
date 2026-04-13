import { downloadUkeapController } from '~/src/server/download_ukeap/controller.js'
import { downloadUkeapstatusController } from '~/src/server/download_ukeap_status/controller.js'

const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/download_ukeap/{year}',
      ...downloadUkeapController
    },
    {
      method: 'GET',
      path: '/download_ukeap_nojs/{year}',
      ...downloadUkeapController
    },
    {
      method: 'GET',
      path: '/download_ukeap_status/{jobID}',
      ...downloadUkeapstatusController
    }
  ])
}

const downloadUkeap = {
  plugin: {
    name: 'downloadUkeap',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { downloadUkeap, configureRoutes }
