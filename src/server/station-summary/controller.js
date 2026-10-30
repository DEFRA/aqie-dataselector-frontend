import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { fetchStationByLocation } from '~/src/server/common/helpers/station-helpers.js'
import { renderNotFound } from '~/src/server/common/helpers/navigation-helpers.js'

const logger = createLogger()

/**
 * Entry point for deep links from other services (e.g. aqie-maps-frontend)
 * that only have a station's coordinates, not a session-scoped station id.
 * Looks the station up, seeds the session as a normal search would, then
 * redirects into /stationdetails. A redirect keeps the original external
 * referer rather than this page's, so /stationdetails can't rely on its
 * referer guard here - deepLinkTrusted is set instead as a one-time handoff.
 *
 * Takes its parameters via POST body rather than query string so coordinates
 * aren't exposed in URLs (browser history, server access logs, onward
 * referer headers). The route's Joi schema has already validated lat/lng are
 * numeric and in range by the time this handler runs.
 */
const stationSummaryController = {
  handler: async (request, h) => {
    const { lat, lng, name } = request.payload

    const station = await fetchStationByLocation({ lat, lng, name })
    if (!station) {
      logger.info(
        `Station summary deep link: no match for lat=${lat}, lng=${lng}`
      )
      return renderNotFound(h)
    }

    request.yar.set('MonitoringstResult', {
      message: 'success',
      getmonitoringstation: [station]
    })
    request.yar.set('SiteId', station.id)
    request.yar.set('nooflocation', 'single')
    request.yar.set('deepLinkTrusted', true)

    // Deep links skip the home page, which is normally what seeds this -
    // without it the table API gets no year filter and returns every year's
    // rows at once.
    if (!request.yar.get('selectedYear')) {
      request.yar.set('selectedYear', new Date().getFullYear().toString())
    }

    return h.redirect('/stationdetails')
  }
}

export { stationSummaryController }
