import { english } from '~/src/server/data/en/homecontent.js'
import { config } from '~/src/config/config.js'
import axios from 'axios'

// Move Invokedownload outside the handler block
async function Invokedownload(apiparams) {
  try {
    const response = await axios.post(config.get('Download_URL'), apiparams)
    return response.data
  } catch (error) {
    return error // Rethrow the error so it can be handled appropriately
  }
}

const stationDetailsController = {
  handler: async (request, h) => {
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    request.yar.set('downloadresult', '')

    const stationDetailsView = 'stationdetails/index'

    if (request.params.download) {
      // If needed, declare apiparams here for download logic
      const apiparams = {
        siteId: request.yar.get('stationdetails')?.localSiteID,
        year: request.yar.get('selectedYear')
      }
      const downloadresult = await Invokedownload(apiparams)
      request.yar.set('downloadresult', downloadresult)

      return h.view(stationDetailsView, {
        pageTitle: english.stationdetails.pageTitle,
        title: english.stationdetails.title,
        serviceName: english.stationdetails.serviceName,
        stationdetails: request.yar.get('stationdetails'),
        maplocation,
        updatedTime,
        displayBacklink: true,
        fullSearchQuery,
        apiparams,
        years,
        currentdate,
        pollutantKeys: request.yar.get('stationdetails').pollutants,
        selectedYear: request.yar.get('selectedYear'),
        downloadresult: request.yar.get('downloadresult'),
        hrefq:
          '/multiplelocations?fullSearchQuery=' +
          fullSearchQuery +
          '&locationMiles=' +
          locationMiles
      })
    } else {
      // If needed, declare apiparams here for non-download logic
      const apiparams = {
        siteId: request.yar.get('stationdetails')?.localSiteID,
        year: request.yar.get('selectedYear')
      }
      return h.view(stationDetailsView, {
        pageTitle: english.stationdetails.pageTitle,
        title: english.stationdetails.title,
        serviceName: english.stationdetails.serviceName,
        stationdetails: request.yar.get('stationdetails'),
        maplocation,
        updatedTime,
        displayBacklink: true,
        fullSearchQuery,
        apiparams,
        years,
        currentdate,
        pollutantKeys: request.yar.get('stationdetails').pollutants,
        selectedYear: request.yar.get('selectedYear'),
        downloadresult: request.yar.get('downloadresult'),
        hrefq:
          '/multiplelocations?fullSearchQuery=' +
          fullSearchQuery +
          '&locationMiles=' +
          locationMiles
      })
    }
  }
}

export { stationDetailsController }
