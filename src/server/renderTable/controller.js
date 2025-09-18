import { config } from '~/src/config/config.js'
import axios from 'axios'
import nunjucks from 'nunjucks'

async function Invoketable(params) {
  // Renamed parameter to avoid shadowing
  try {
    const response = await axios.post(config.get('Table_URL'), params)
    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
}

const rendertablecontroller = {
  handler: async (request, h) => {
    try {
      request.yar.set('selectedYear', request.params.year)
      const tabledata1 = [
        {
          pollutantName: 'PM2.5',
          hourlyCount: 'n/a',
          dailyCount: 23,
          annualcount: 24,
          dataVerifiedTag: 'Data has been verified',
          dataCapturePercentage: 97
        },
        {
          pollutantName: 'PM10',
          hourlyCount: 'n/a',
          dailyCount: 36,
          annualcount: 42,
          dataVerifiedTag: 'Data has been verified',
          dataCapturePercentage: 97
        },
        {
          pollutantName: 'Nitrogen dioxide',
          hourlyCount: 19,
          dailyCount: 'n/a',
          annualcount: 45,
          dataVerifiedTag: 'Data has been verified',
          dataCapturePercentage: 99
        },
        {
          pollutantName: 'Ozone',
          hourlyCount: 'n/a',
          dailyCount: 'n/a',
          annualcount: 90,
          dataVerifiedTag: 'Data has been verified',
          dataCapturePercentage: 91
        },
        {
          pollutantName: 'Sulphur dioxide',
          hourlyCount: '0',
          dailyCount: 4,
          annualcount: 91,
          dataVerifiedTag: 'Data has been verified',
          dataCapturePercentage: 92
        }
      ]

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
        request.yar.set('tabledata', tabledata1)
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
