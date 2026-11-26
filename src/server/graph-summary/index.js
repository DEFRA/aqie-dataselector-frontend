import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'
import {
  graphSummaryController,
  graphSummaryPostController
} from '~/src/server/graph-summary/controller.js'
import { GRAPH_SUMMARY_PATH } from '~/src/server/graph-summary/links.js'
import { graphSummaryPayloadSchema } from '~/src/server/graph-summary/schema.js'

const logger = createLogger()

// The payload is a few short fields, so cap it well below hapi's 1MB default.
const MAX_PAYLOAD_BYTES = 1024

const configureRoutes = (server) => {
  if (!config.get('featureFlags.viewGraphSummary')) {
    return
  }

  server.route([
    {
      method: 'GET',
      path: GRAPH_SUMMARY_PATH,
      ...graphSummaryController
    },
    {
      method: 'POST',
      path: GRAPH_SUMMARY_PATH,
      options: {
        payload: { maxBytes: MAX_PAYLOAD_BYTES },
        validate: {
          payload: graphSummaryPayloadSchema,
          options: { stripUnknown: true },
          // Renders the same not-found page as an unknown station, rather than a
          // raw 400, so a malformed form doesn't leak validation details.
          failAction: (_request, h, error) => {
            logger.info(`Graph summary: invalid payload - ${error.message}`)
            return renderNotFound(h).takeover()
          }
        }
      },
      ...graphSummaryPostController
    }
  ])
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
