import Joi from 'joi'
import {
  LATITUDE_MIN,
  LATITUDE_MAX,
  LONGITUDE_MIN,
  LONGITUDE_MAX,
  MAX_STATION_NAME_LENGTH
} from '~/src/server/common/constants/magic-numbers.js'

// Validates the POST body for /station-summary - a public, unauthenticated
// route reachable from other services (e.g. aqie-maps-frontend), so lat/lng/
// name can't be trusted to already be well-formed.
const stationSummaryPayloadSchema = Joi.object({
  lat: Joi.number().min(LATITUDE_MIN).max(LATITUDE_MAX).required(),
  lng: Joi.number().min(LONGITUDE_MIN).max(LONGITUDE_MAX).required(),
  name: Joi.string().max(MAX_STATION_NAME_LENGTH).allow('').default('')
})

export { stationSummaryPayloadSchema }
