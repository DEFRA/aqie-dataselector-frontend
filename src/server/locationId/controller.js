import { english } from '~/src/server/data/en/homecontent.js'
import { config } from '~/src/config/index.js'
import axios from 'axios'
const getLocationDetailsController = {
  handler: async (request, h) => {
    // const { query } = request

    const locationID = request.params.id

    const result = request.yar.get('osnameapiresult')
    const fullSearchQuery = request.yar.get('fullSearchQuery').value
    request.yar.set('locationID', request.params.id)
    const locationMiles = request.yar.get('locationMiles')
    const hrefq =
      '/multiplelocations?fullSearchQuery=' +
      fullSearchQuery +
      '&locationMiles=' +
      locationMiles
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    let userLocation = ''
    if (result != null && locationID != null) {
      const locations = result.getOSPlaces
      if (locations) {
        for (const x of result.getOSPlaces) {
          if (x.GAZETTEER_ENTRY.ID === locationID) {
            userLocation = x.GAZETTEER_ENTRY.NAME1
          }
        }
      }
      async function InvokeMonitstnAPI() {
        try {
          const response = await axios.get(
            config.get('OS_NAMES_API_URL_1') +
              userLocation +
              '&miles=' +
              locationMiles
          )

          return response.data
        } catch (error) {
          return error // Rethrow the error so it can be handled appropriately
        }
      }
      const MonitoringstResult = await InvokeMonitstnAPI()
      request.yar.set('MonitoringstResult', MonitoringstResult)

      const map1 = new Map()

      if (MonitoringstResult.getmonitoringstation.length !== 0) {
        for (const ar of MonitoringstResult.getmonitoringstation) {
          const poll = ar.pollutants
          const poll1 = Object.keys(poll)
          const pollarray = []
          let pollutant
          for (const p of poll1) {
            if (p === 'PM25' || p === 'GR25') {
              pollutant = 'PM2.5'
            } else if (p === 'MP10' || p === 'GE10' || p === 'GR10') {
              pollutant = 'PM10'
            } else {
              pollutant = p
            }
            pollarray.push(pollutant)
          }
          const pollkeys = pollarray.filter(
            (item, index) => pollarray.indexOf(item) === index
          )
          map1.set(ar.name, pollkeys)
        }

        if (userLocation) {
          return h.view('monitoring-station/index', {
            pageTitle: english.monitoringStation.pageTitle,
            title: english.monitoringStation.title,
            serviceName: english.monitoringStation.serviceName,
            paragraphs: english.monitoringStation.paragraphs,
            searchLocation: userLocation,
            locationMiles,
            monitoring_station: MonitoringstResult.getmonitoringstation,
            pollmap: map1,
            displayBacklink: true,
            fullSearchQuery,
            hrefq
          })
        }
      } else {
        return h.view('multiplelocations/nostation', {
          locationMiles,
          serviceName: english.noStation.heading,
          paragraph: english.noStation.paragraphs,
          searchLocation: userLocation,
          displayBacklink: true,
          hrefq
        })
      }

      //   const x = query
      // const invalidSearchEntry = false
    }
  }
}

export { getLocationDetailsController }
