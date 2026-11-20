import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'
import { graphSummaryController } from '~/src/server/graph-summary/controller.js'
import { GRAPH_SUMMARY_PATH } from '~/src/server/graph-summary/links.js'
import { graphSummaryQuerySchema } from '~/src/server/graph-summary/schema.js'

const logger = createLogger()

const configureRoutes = (server) => {
  if (!config.get('featureFlags.viewGraphSummary')) {
    return
  }

  server.route({
    method: 'GET',
    path: GRAPH_SUMMARY_PATH,
    options: {
      validate: {
        query: graphSummaryQuerySchema,
        options: { stripUnknown: true },
        // Renders the same not-found page as an unknown station, rather than a
        // raw 400, so a malformed link doesn't leak validation details.
        failAction: (_request, h, error) => {
          logger.info(`Graph summary: invalid query - ${error.message}`)
          return renderNotFound(h).takeover()
        }
      }
    },
    ...graphSummaryController
  })
}

const graphSummary = {
  plugin: {
    name: 'graph-summary',
    register: (server) => {
      configureRoutes(server)
    }
  }
}

export { graphSummary, configureRoutes }
