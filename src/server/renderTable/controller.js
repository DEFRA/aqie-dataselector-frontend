import nunjucks from 'nunjucks'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { fetchYearTable } from '~/src/server/common/helpers/station-helpers.js'
import {
  buildViewGraphSummary,
  resolveLast7Days
} from '~/src/server/stationdetails/controller.js'
import { formatDate } from '~/src/config/nunjucks/filters/format-date.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()

async function renderLast7DaysPartial(request, h) {
  const station = request.yar.get('stationdetails')
  const last7Days = station ? await resolveLast7Days(station) : {}
  const durationText =
    last7Days.pollutants?.length && last7Days.periodStart && last7Days.periodEnd
      ? `${formatDate(last7Days.periodStart, 'd MMMM')} to ${formatDate(last7Days.periodEnd, 'd MMMM yyyy')}`
      : ''

  const partialContent = nunjucks.render('partials/last7daystable.njk', {
    last7Days,
    durationText
  })

  return h.response(partialContent).code(HTTP_OK)
}

const rendertablecontroller = {
  handler: async (request, h) => {
    try {
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
        viewGraphSummary: buildViewGraphSummary(request),
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
