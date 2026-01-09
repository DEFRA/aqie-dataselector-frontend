import { config } from '~/src/config/config.js'
import axios from 'axios'
import nunjucks from 'nunjucks'
// import Wreck from '@hapi/wreck'
async function Invoketable(params) {
  // Renamed parameter to avoid shadowing
  try {
    const response = await axios.post(config.get('Table_URL'), params)
    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }

  // dev
  // try {
  //   const url = 'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomHistoryexceedence/'
  //   const { res, payload } = await Wreck.post(url, {
  //     payload: JSON.stringify(params),
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'x-api-key': 'E5u7Pq9NBl7WOMK3xedmjgu5aG7okT1O'
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

      const tabledata = await Invoketable(apiparams)
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

      return h.response(partialContent1).code(200)
    } catch (error) {
      return h.response('Error rendering partial content').code(500)
    }
  }
}

export { rendertablecontroller }
