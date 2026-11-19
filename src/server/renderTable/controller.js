import nunjucks from 'nunjucks'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  fetchYearTable,
  resolveStationHistory
} from '~/src/server/common/helpers/station-helpers.js'
import { HISTORY_PERIOD } from '~/src/server/common/constants/history-period.js'
import { buildViewGraphSummary } from '~/src/server/graph-summary/call-to-action.js'
import { resolveDaqi } from '~/src/server/stationdetails/controller.js'
import { formatDate } from '~/src/config/nunjucks/filters/format-date.js'
import {
  HTTP_OK,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'
import { config } from '~/src/config/config.js'

const logger = createLogger()

const LONG_DATE_FORMAT = 'd MMMM yyyy'

async function renderLast24HoursPartial(request, h) {
  const station = request.yar.get('stationdetails')
  const last24Hours = station
    ? await resolveStationHistory(station, HISTORY_PERIOD.LAST_24_HOURS)
    : {}
  // The Last 24 hours date stamp is always today's date, not the date of the
  // newest reading.
  const durationText = formatDate(new Date(), LONG_DATE_FORMAT)

  const partialContent = nunjucks.render('partials/last24hourstable.njk', {
    last24Hours,
    durationText,
    viewGraphSummary: buildViewGraphSummary({
      stationId: station?.id,
      period: 'last24hours',
      from: 'last24hours'
    })
  })

  return h.response(partialContent).code(HTTP_OK)
}

async function renderDaqiPartial(request, h) {
  const station = request.yar.get('stationdetails')
  const daqi = station ? await resolveDaqi(station) : {}
  const durationText = formatDate(
    daqi.periodDate ?? new Date().toISOString(),
    LONG_DATE_FORMAT
  )

  const partialContent = nunjucks.render('partials/daqitable.njk', {
    daqi,
    durationText,
    viewGraphSummary: buildViewGraphSummary({
      stationId: station?.id,
      period: 'last24hours'
    })
  })

  return h.response(partialContent).code(HTTP_OK)
}

async function renderLast7DaysPartial(request, h) {
  const station = request.yar.get('stationdetails')
  const last7Days = station
    ? await resolveStationHistory(station, HISTORY_PERIOD.LAST_7_DAYS)
    : {}
  const durationText =
    last7Days.pollutants?.length && last7Days.periodStart && last7Days.periodEnd
      ? `${formatDate(last7Days.periodStart, 'd MMMM')} to ${formatDate(last7Days.periodEnd, LONG_DATE_FORMAT)}`
      : ''

  const partialContent = nunjucks.render('partials/last7daystable.njk', {
    last7Days,
    durationText,
    viewGraphSummary: buildViewGraphSummary({
      stationId: station?.id,
      period: 'last7days',
      from: 'last7days'
    })
  })

  return h.response(partialContent).code(HTTP_OK)
}

const rendertablecontroller = {
  handler: async (request, h) => {
    try {
      if (request.params.year === 'daqi') {
        if (!config.get('featureFlags.viewDaqiTab')) {
          return h.response('Not found').code(HTTP_NOT_FOUND)
        }
        return await renderDaqiPartial(request, h)
      }

      if (request.params.year === 'last-24-hours') {
        return await renderLast24HoursPartial(request, h)
      }

      if (request.params.year === 'last-7-days') {
        return await renderLast7DaysPartial(request, h)
      }

      request.yar.set('selectedYear', request.params.year)

      const tabledata = await fetchYearTable({
        siteId: request.yar.get('stationdetails')?.localSiteID,
        year: request.params.year
      })

      request.yar.set('tabledata', tabledata)
      const finalyear = request.yar.get('selectedYear')

      const partialContent1 = nunjucks.render('partials/yearlytable.njk', {
        tabledata,
        finalyear,
        viewGraphSummary: buildViewGraphSummary({
          stationId: request.yar.get('stationdetails')?.id,
          from: finalyear
        }),
        // This response is injected with innerHTML, where <script> tags never
        // execute - so the template omits them rather than sending dead bytes.
        isPartial: true
      })

      return h.response(partialContent1).code(HTTP_OK)
    } catch (error) {
      logger.error(`Render table error: ${error.message}`)
      return h
        .response('Error rendering table')
        .code(HTTP_INTERNAL_SERVER_ERROR)
    }
  }
}

export { rendertablecontroller }
