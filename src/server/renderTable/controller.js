import { config } from '~/src/config/config.js'
import axios from 'axios'
import nunjucks from 'nunjucks'
const rendertablecontroller = {
  handler: async (request, h) => {
    try {
      request.yar.set('selectedYear', request.params.year)
      // const stndetails = request.yar.get('stationdetails')
      // const url = request.yar.get('stationdetails').localSiteID // Example URL
      const apiparams = {
        siteId: request.yar.get('stationdetails').localSiteID,
        year: request.params.year
      }

      const tabledata = await Invoketable(apiparams)
      const finalyear = request.yar.get('selectedYear')

      async function Invoketable() {
        try {
          const response = await axios.post(config.get('Table_URL'), apiparams)
          // logger.info(`response data ${JSON.stringify(response.data)}`)
          return response.data
        } catch (error) {
          return error // Rethrow the error so it can be handled appropriately
        }
      }

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
      // console.log("request.yar.get('tabledata')",request.yar.get('tabledata'))
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
