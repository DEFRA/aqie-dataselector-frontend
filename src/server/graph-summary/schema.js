import Joi from 'joi'
import { MAX_STATION_NAME_LENGTH } from '~/src/server/common/constants/magic-numbers.js'
import {
  PERIOD_KEYS,
  DEFAULT_PERIOD
} from '~/src/server/graph-summary/periods.js'

// Validates the query string of the graph summary page. stationId is only ever
// compared with the stations in the user's session, never used to look
// anything up, but it still has to be a bounded, non-empty string.
const graphSummaryQuerySchema = Joi.object({
  stationId: Joi.string().trim().max(MAX_STATION_NAME_LENGTH).required(),
  period: Joi.string()
    .valid(...PERIOD_KEYS)
    .default(DEFAULT_PERIOD),
  nojs: Joi.boolean().default(false)
})

export { graphSummaryQuerySchema }
