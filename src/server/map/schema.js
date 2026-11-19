import Joi from 'joi'

// Generous box around the UK and its monitoring stations; anything outside is rejected.
const UK_BOUNDS = {
  minLat: 49,
  maxLat: 61,
  minLng: -9,
  maxLng: 3
}

/**
 * Payload for POST /map/view, sent by the dataselector station page's "View map
 * of nearby monitoring stations" link to open the map at that station. Posted
 * rather than put in the URL, so it can't be used to craft arbitrary map links.
 */
const nearbyStationsPayloadSchema = Joi.object({
  lat: Joi.number().min(UK_BOUNDS.minLat).max(UK_BOUNDS.maxLat).required(),
  lng: Joi.number().min(UK_BOUNDS.minLng).max(UK_BOUNDS.maxLng).required(),
  siteId: Joi.string()
    .pattern(/^[A-Za-z0-9]{1,12}$/)
    .optional()
}).options({ stripUnknown: true })

export { nearbyStationsPayloadSchema }
