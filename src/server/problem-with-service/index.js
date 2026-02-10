import { problemWithServiceController } from '~/src/server/problem-with-service/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const problemWithService = {
  plugin: {
    name: 'problem-with-service',
    register(server) {
      server.route({
        method: 'GET',
        path: '/problem-with-service',
        ...problemWithServiceController
      })
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
