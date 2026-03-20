import { config } from '~/src/config/config.js'
import axios from 'axios'

async function invokeDownload(apiparams) {
  try {
    const response = await axios.post(config.get('Download_URL'), apiparams)
    return response.data
  } catch (error) {
    return error
  }
}

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
      const downloadresult = await invokeDownload(apiparams)

      request.yar.set('downloadresult', downloadresult)
      const viewData = {
        ...request.yar.get('viewData'),
        downloadresult
      }

      if (request.url.pathname.includes('/downloaddatanojs/')) {
        return h.view('stationDetailsNojs/index', viewData)
      }
      return h.response(downloadresult).type('application/json').code(200)
    } catch (error) {
      return h.response('Error rendering partial content').code(500)
    }
  }
}

export { downloadcontroller }
