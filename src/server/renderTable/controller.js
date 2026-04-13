import { config } from '~/src/config/config.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import nunjucks from 'nunjucks'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()
async function invokeTable(params) {
  if (config.get('isDevelopment')) {
    // localhost: use Wreck with dev API URL and key
    try {
      const url = config.get('tableDevUrl')
      const { payload } = await Wreck.post(url, {
        payload: JSON.stringify(params),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.get('osNamesDevApiKey')
        },
        json: true
      })
      return payload
    } catch (error) {
      logger.error(`Table API error (local): ${error.message}`)
      return null
    }
  } else {
    // dev / test / prod environments: use axios with config URL
    try {
      const response = await axios.post(config.get('Table_URL'), params)
      return response.data
    } catch (error) {
      logger.error(`Table API error: ${error.message}`)
      return null
    }
  }
}

const rendertablecontroller = {
  handler: async (request, h) => {
    try {
      request.yar.set('selectedYear', request.params.year)

      const apiparams = {
        siteId: request.yar.get('stationdetails').localSiteID,
        year: request.params.year
      }

      const tabledata = await invokeTable(apiparams)
      const finalyear = request.yar.get('selectedYear')

      if (
        !tabledata || // null or undefined
        (Array.isArray(tabledata) && tabledata.length === 0) || // empty array
        (typeof tabledata === 'object' &&
          !Array.isArray(tabledata) &&
          Object.keys(tabledata).length === 0) // empty object
      ) {
        request.yar.set('tabledata', null)
      } else {
        request.yar.set('tabledata', tabledata)
      }

      // Render the partial template with the URL data
      const partialContent1 = nunjucks.render('partials/yearlytable.njk', {
        tabledata: request.yar.get('tabledata'),
        finalyear
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
