import { config } from '~/src/config/index.js'
import axios from 'axios'

const downloadcontroller = {
  handler: async (request, h) => {
    try {
      const stndetails = request.yar.get('stationdetails')
      const apiparams = {
        region: stndetails.region,
        siteType: stndetails.siteType,
        sitename: stndetails.name,
        siteId: stndetails.localSiteID,
        latitude: stndetails.location.coordinates[0].toString(),
        longitude: stndetails.location.coordinates[1].toString(),
        year: request.yar.get('selectedYear'),
        downloadpollutant: request.params.poll,
        downloadpollutanttype: request.params.freq,
        stationreaddate: request.yar.get('latesttime')
      }
      const downloadresult = await Invokedownload(apiparams)

      request.yar.set('downloadresult', downloadresult)
      async function Invokedownload() {
        try {
          const response = await axios.post(
            config.get('Download_URL'),
            apiparams
          )
          // logger.info(`response data ${JSON.stringify(response.data)}`)
          return response.data
        } catch (error) {
          return error // Rethrow the error so it can be handled appropriately
        }
      }

      // console.log('downloadresult at 71', downloadresult)
      // const url1 = 'https://url'
      return h.response(downloadresult).type('application/json').code(200)
    } catch (error) {
      // console.error('Error rendering partial content:', error)
      //  return h.response('Error rendering partial content').code(500);
    }
  }
}

export { downloadcontroller }
