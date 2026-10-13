import { stationSummaryController } from '~/src/server/station-summary/controller.js'
import { stationSummaryPayloadSchema } from '~/src/server/station-summary/schema.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const configureRoutes = (server) => {
  server.route([
    {
      method: 'POST',
      path: '/station-summary',
      options: {
        validate: {
          payload: stationSummaryPayloadSchema,
          // Renders the same not-found page as an unmatched station, rather than
          // a raw 400, so a malformed deep link doesn't leak validation details.
          failAction: (_request, h, error) => {
            logger.info(
              `Station summary deep link: invalid payload - ${error.message}`
            )
            return renderNotFound(h).takeover()
          }
        }
      },
      ...stationSummaryController
    }
  ])
}

const stationSummary = {
  plugin: {
    name: 'station-summary',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { stationSummary, configureRoutes }
