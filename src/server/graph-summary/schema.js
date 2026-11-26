import Joi from 'joi'
import { MAX_STATION_NAME_LENGTH } from '~/src/server/common/constants/magic-numbers.js'
import {
  PERIOD_KEYS,
  DEFAULT_PERIOD
} from '~/src/server/graph-summary/periods.js'
import { isStationTab } from '~/src/server/graph-summary/links.js'

// Validates the form posted to the graph summary page. stationId is only ever
// compared with the stations in the user's session, never used to look
// anything up, but it still has to be a bounded, non-empty string. `from` is
// the station page tab the user came from, which Back returns to; it only ever
// selects one of a fixed set of station page paths.
const graphSummaryPayloadSchema = Joi.object({
  stationId: Joi.string().trim().max(MAX_STATION_NAME_LENGTH).required(),
  period: Joi.string()
    .valid(...PERIOD_KEYS)
    .default(DEFAULT_PERIOD),
  from: Joi.string().custom((value, helpers) =>
    isStationTab(value) ? value : helpers.error('any.invalid')
  )
})

export { graphSummaryPayloadSchema }
