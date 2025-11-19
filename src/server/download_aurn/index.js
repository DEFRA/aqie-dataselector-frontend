import { downloadAurnController } from '~/src/server/download_aurn/controller.js'

export const downloadAurn = {
  plugin: {
    name: 'downloadAurn',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/download_aurn/{year}',
          ...downloadAurnController
        }
      ])
    }
  }
}
