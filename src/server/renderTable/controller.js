import nunjucks from 'nunjucks'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { fetchYearTable } from '~/src/server/common/helpers/station-helpers.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()

const rendertablecontroller = {
  handler: async (request, h) => {
    try {
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
