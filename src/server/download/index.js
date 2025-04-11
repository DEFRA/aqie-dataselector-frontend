import { downloadcontroller } from '~/src/server/download/controller.js'

export const download = {
  plugin: {
    name: 'download',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/downloaddata/{poll}/{freq}',
          ...downloadcontroller
        }
      ])
    }
  }
}
