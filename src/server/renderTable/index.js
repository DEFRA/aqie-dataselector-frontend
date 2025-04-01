import { rendertablecontroller } from '~/src/server/renderTable/controller.js'

export const renderTable = {
  plugin: {
    name: 'rendertable',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/rendertable/{year}',
          ...rendertablecontroller
        }
      ])
    }
  }
}
