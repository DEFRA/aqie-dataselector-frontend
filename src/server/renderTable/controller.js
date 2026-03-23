import { config } from '~/src/config/config.js'
import axios from 'axios'
import nunjucks from 'nunjucks'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()
async function invokeTable(params) {
  // Renamed parameter to avoid shadowing
  try {
    const response = await axios.post(config.get('Table_URL'), params)
    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
  //       'x-api-key': 'cFg6wtLp5oOKue2aAT1O897rGpHJm2g3'
  //     },
  //     json: true
  //   })
  //   console.log("PAYLOAD", payload)
  //   return payload
  // } catch (error) {
  //   // Return a safe error object instead of the full error which may contain circular references
  //   console.error('API Error:', error.message)
  //   return { error: error.message || 'API request failed' }
  // }
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
