import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import axios from 'axios'
import { HTTP_OK } from '~/src/server/common/constants/magic-numbers.js'

const logger = createLogger()

async function invokeDownload(apiparams) {
  try {
    const response = await axios.post(config.get('Download_URL'), apiparams)
    return response.data
  } catch (error) {
    logger.error(`Download API error: ${error.message}`)
    return null
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

      if (downloadresult === null) {
        logger.error('Download API returned null')
        throw new Error('Download API failed')
      }

      request.yar.set('downloadresult', downloadresult)
      const viewData = {
        ...request.yar.get('viewData'),
        downloadresult
      }

      if (request.url.pathname.includes('/downloaddatanojs/')) {
        return h.view('stationDetailsNojs/index', viewData)
      }
      return h.response(downloadresult).type('application/json').code(HTTP_OK)
    } catch (error) {
      logger.error(`Download handler error: ${error.message}`)
      return h.redirect('/problem-with-service?statusCode=500')
    }
  }
}

export { downloadcontroller }
