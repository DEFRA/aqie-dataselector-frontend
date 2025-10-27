import { downloadAurnController } from '~/src/server/download_aurn/controller.js'

const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/download_aurn',
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
