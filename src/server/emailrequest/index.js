import { emailrequestController } from '~/src/server/emailrequest/controller.js'

/**
 * Sets up the routes used in the customdataset page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const emailrequest = {
  plugin: {
    name: 'emailrequest',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/emailrequest',
          ...emailrequestController
        },
        {
          method: 'GET',
          path: '/emailrequest/confirm',
          ...emailrequestController
        },
        {
          method: 'POST',
          path: '/emailrequest/confirm',
          ...emailrequestController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
