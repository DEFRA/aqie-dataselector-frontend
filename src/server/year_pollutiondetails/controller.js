import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

import axios from 'axios'
const getpollutantsDetailsController = {
  handler: async (request, h) => {
    // console.log('request.params.id', request.params.id)

    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.set('downloadresult', '')
    const logger = createLogger()

    // const downloadparam = {sitename, region, sitetype, year, latitude & longitude}

    const stndetails = request.yar.get('stationdetails')

    const apiparams = {
      region: stndetails.region,
      siteType: stndetails.siteType,
      sitename: stndetails.name,
      siteId: stndetails.localSiteID,
      latitude: stndetails.location.coordinates[0].toString(),
      longitude: stndetails.location.coordinates[1].toString(),
      year: request.yar.get('yearselected')
    }
    const downloadresult = await Invokedownload(apiparams)

    async function Invokedownload() {
      try {
        const response = await axios.post(
          'https://aqie-historicaldata-backend.dev.cdp-int.defra.cloud/AtomHistoryHourlydata/',
          apiparams
        )
        logger.info(`response data ${JSON.stringify(response.data)}`)
        return response.data
      } catch (error) {
        return error // Rethrow the error so it can be handled appropriately
      }
    }

    // const multiplelocID = request?.yar?.get('locationID')
    request.yar.set('downloadresult', downloadresult)

    // const { home } = english
    try {
      return h.redirect('/some-path', {}).takeover()
    } catch (error) {
      // console.log('error', error)
    }
  }
}

export { getpollutantsDetailsController }
