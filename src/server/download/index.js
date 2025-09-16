import { downloadcontroller } from '~/src/server/download/controller.js'

const configureRoutes = (server) => {
  server.route([
    {
      method: 'GET',
      path: '/downloaddata/{poll}/{freq}',
      ...downloadcontroller
    },
    {
      method: 'GET',
      path: '/downloaddatanojs/{poll}/{freq}',
      ...downloadcontroller
    }
  ])
}

const download = {
  plugin: {
    name: 'download',
    register: (server) => {
      configureRoutes(server)
    }
  }
}
export { download, configureRoutes }
