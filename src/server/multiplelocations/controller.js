import { english } from '~/src/server/data/en/homecontent.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
import { config } from '~/src/config/index.js'
import axios from 'axios'

const multipleLocationsController = {
  handler: async (request, h) => {
    if (request != null) {
      request.yar.set('errors', '')
      request.yar.set('errorMessage', '')
      request.yar.set('locationMiles', request.query?.locationMiles)
      request.yar.set('selectedLocation', '')

      if (request.query?.fullSearchQuery?.length > 0) {
        request.yar.set('fullSearchQuery', {
          value: decodeURI(request.query.fullSearchQuery)
        })
        request.yar.set('searchQuery', {
          value: decodeURI(
            request.query.searchQuery?.replace(/ *\([^)]*\) */g, '')
          )
        })
      }
    }

    const searchInput = request.query.fullSearchQuery
    const searchValue = request.query.fullSearchQuery
    const locationMiles = request.query?.locationMiles

    if (searchValue !== '' || searchValue !== null) {
      request.yar.set('searchLocation', searchValue)
    } else {
      request.yar.set('searchLocation', '')
    }
    if (searchInput) {
      request.yar.set('errors', '')
      request.yar.set('errorMessage', '')
      const locationdetails = request.yar.get('osnameapiresult')

      let locations = ''
      let MonitoringstResult = ''
      const map1 = new Map()
      if (
        locationdetails.length === 0 ||
        locationdetails.length === undefined
      ) {
        const result = await invokeosnameAPI()
        if (result != null) {
          request.yar.set('osnameapiresult', result)
        }
        async function invokeosnameAPI() {
          try {
            const response = await axios.get(
              config.get('OS_NAMES_API_URL') + searchValue
            )

            return response.data
          } catch (error) {
            return error // Rethrow the error so it can be handled appropriately
          }
        }

        locations = result.getOSPlaces
      } else {
        locations = locationdetails.getOSPlaces
      }

      if (searchValue !== '' || searchValue !== null) {
        MonitoringstResult = await InvokeMonitstnAPI()

        if (MonitoringstResult !== null) {
          request.yar.set('MonitoringstResult', MonitoringstResult)
        }
        async function InvokeMonitstnAPI() {
          try {
            const response = await axios.get(
              config.get('OS_NAMES_API_URL_1') +
                searchValue +
                '&miles=' +
                locationMiles
            )

            return response.data
          } catch (error) {
            return error // Rethrow the error so it can be handled appropriately
          }
        }

        if (locations !== undefined && locations.length > 0) {
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
          }
        } else {
          request.yar.set('errors', '')
          request.yar.set('errorMessage', '')
          request.yar.set('nooflocation', 'none')
          return h.view('multiplelocations/nolocation', {
            results: locations,
            serviceName: english.notFoundLocation.heading,
            paragraph: english.notFoundLocation.paragraphs,
            searchLocation: searchValue,
            displayBacklink: true,
            hrefq: '/search-location'
          })
        }
      }

      if (locations) {
        if (locations === undefined || locations.length === 0) {
          request.yar.set('errors', '')
          request.yar.set('errorMessage', '')
          request.yar.set('nooflocation', 'none')
          return h.view('multiplelocations/nolocation', {
            results: locations,
            serviceName: english.notFoundLocation.heading,
            paragraph: english.notFoundLocation.paragraphs,
            searchLocation: searchValue,
            displayBacklink: true,
            hrefq: '/search-location'
          })
        } else if (locations.length === 1) {
          request.yar.set('errors', '')
          request.yar.set('errorMessage', '')
          request.yar.set('nooflocation', 'single')
          if (MonitoringstResult.getmonitoringstation.length === 0) {
            return h.view('multiplelocations/nostation', {
              locationMiles,
              serviceName: english.noStation.heading,
              paragraph: english.noStation.paragraphs,
              searchLocation: searchValue,
              displayBacklink: true,
              hrefq: '/search-location'
            })
          } else {
            return h.view('monitoring-station/index', {
              pageTitle: english.monitoringStation.pageTitle,
              title: english.monitoringStation.title,
              serviceName: english.monitoringStation.serviceName,
              paragraphs: english.monitoringStation.paragraphs,
              searchLocation: searchValue,
              locationMiles,
              monitoring_station: MonitoringstResult.getmonitoringstation,
              pollmap: map1,

              displayBacklink: true,
              hrefq: '/search-location'
            })
          }
        } else {
          request.yar.set('errors', '')
          request.yar.set('errorMessage', '')
          request.yar.set('nooflocation', 'multiple')
          return h.view('multiplelocations/index', {
            results: locations,
            pageTitle: english.multipleLocations.pageTitle,
            heading: english.multipleLocations.heading,
            page: english.multipleLocations.page,
            serviceName: english.searchLocation.serviceName,
            title: english.multipleLocations.title,
            params: english.multipleLocations.paragraphs,
            button: english.multipleLocations.button,
            locationMiles,
            searchLocation: searchValue,
            monitoring_station: MonitoringstResult.getmonitoringstation,
            displayBacklink: true,
            hrefq: '/search-location'
          })
        }
      }
    } else {
      const fullSearchQuery = request.query.fullSearchQuery
      if (!searchInput?.value) {
        const errorData = english.searchLocation.errorText.uk
        const errorSection = errorData?.fields
        setErrorMessage(request, errorSection?.title, errorSection?.text)
        const errors = request.yar?.get('errors')
        const errorMessage = request.yar?.get('errorMessage')
        request.yar.set('errors', '')
        request.yar.set('errorMessage', '')
        request.yar.set('fullSearchQuery', '')
        request.yar.set('osnameapiresult', '')
        return h.view('search-location/index', {
          pageTitle: english.searchLocation.pageTitle,
          heading: english.searchLocation.heading,
          page: english.searchLocation.page,
          serviceName: english.searchLocation.serviceName,
          params: english.searchLocation.searchParams,
          button: english.searchLocation.button,
          displayBacklink: true,
          fullSearchQuery,
          hrefq: '/',
          errors,
          errorMessage
        })
      }
    }
  }
}

export { multipleLocationsController }
