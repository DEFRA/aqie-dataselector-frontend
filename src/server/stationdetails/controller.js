import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import { config } from '~/src/config/index.js'
const stationDetailsController = {
  handler: async (request, h) => {
    // const { query } = request

    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')

    request.yar.set('downloadresult', '')

    // console.log("Selectedyear", request.yar.get('selectedYear'))
    if (request.params.download) {
      request.yar.set('selectedYear', request.params.download)
      request.yar.set('downloadPollutant', request.params.pollutant)
      request.yar.set('downloadFrequency', request.params.frequency)
    }

    // else
    // {
    //   request.yar.set('selectedYear','2024')
    // }
    if (request != null) {
      const MonitoringstResult = request.yar.get('MonitoringstResult')
      if (MonitoringstResult !== null) {
        const result = MonitoringstResult.getmonitoringstation

        for (const x of result) {
          if (x.id === request.params.id) {
            request.yar.set('stationdetails', x)
          }
        }
      }
    }
    const stndetails = request.yar.get('stationdetails')

    // const pollutants = stndetails.pollutants
    //  const pollutantKeys = Object.keys(stndetails.pollutants)
    const cd = new Date()
    cd.setDate(cd.getDate() - 1)
    const formattedDat = cd.toISOString().split('.')[0] + 'Z'
    request.yar.set('latesttime', formattedDat)
    const updatedTime = ParseDateformat(formattedDat)
    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    const date = new Date()
    const day = date.getDate()
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    const month = monthNames[date.getMonth()]

    const currentdate = `${day} ${month}`

    function ParseDateformat(Apidate) {
      const originalDate = Apidate
      // Create a new Date object
      const date = new Date(originalDate)
      // Extract the desired components
      const hours = date.getUTCHours()
      const minutes = date.getUTCMinutes()
      const ampm = hours >= 12 ? 'pm' : 'am'
      const formattedHours = hours % 12 || 12 // Convert to 12-hour format
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes
      const day = date.getUTCDate()
      const month = date.toLocaleString('en-GB', { month: 'long' })
      const year = date.getUTCFullYear()

      // Construct the final formatted string
      const finalFormattedDate = `${formattedHours}:${formattedMinutes} ${ampm} on ${day} ${month} ${year}`

      return finalFormattedDate
    }

    const lat = request.yar.get('stationdetails').location.coordinates[0]
    const longitude1 = request.yar.get('stationdetails').location.coordinates[1]
    const maplocation =
      'https://www.google.co.uk/maps?q=' + lat + ',' + longitude1
    const fullSearchQuery = request?.yar?.get('fullSearchQuery').value

    const locationMiles = request?.yar?.get('locationMiles')
    const multiplelocID = request?.yar?.get('locationID')
    // const apiparams = {
    //   region: stndetails.region,
    //   siteType: stndetails.siteType,
    //   sitename: stndetails.name,
    //   siteId: stndetails.localSiteID,
    //   latitude: stndetails.location.coordinates[0].toString(),
    //   longitude: stndetails.location.coordinates[1].toString(),
    //   year: request.yar.get('selectedYear'),
    // currentdate
    // }
    // NewApi
    const apiparams = {
      region: stndetails.region,
      siteType: stndetails.siteType,
      sitename: stndetails.name,
      siteId: stndetails.localSiteID,
      latitude: stndetails.location.coordinates[0].toString(),
      longitude: stndetails.location.coordinates[1].toString(),

      year: request.yar.get('selectedYear'),
      downloadpollutant: request.yar.get('downloadPollutant'),
      downloadpollutanttype: request.yar.get('downloadFrequency'),
      stationreaddate: stndetails.updated
    }
    if (request.params.download) {
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
      // return h.view('src/server/common/templates/partials/downloads.njk', {
      //   apiparams,
      //   years,
      //   currentdate,
      //   pollutantKeys,
      //   selectedYear: request.yar.get('selectedYear'),
      //   downloadresult: request.yar.get('downloadresult')
      // });

      return h.view('stationdetails/index', {
        pageTitle: english.monitoringStation.pageTitle,
        title: english.monitoringStation.title,
        serviceName: english.monitoringStation.serviceName,
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
      if (request.yar.get('nooflocation') === 'single') {
        return h.view('stationdetails/index', {
          pageTitle: english.monitoringStation.pageTitle,
          title: english.monitoringStation.title,
          serviceName: english.monitoringStation.serviceName,
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
        return h.view('stationdetails/index', {
          pageTitle: english.monitoringStation.pageTitle,
          title: english.monitoringStation.title,
          serviceName: english.monitoringStation.serviceName,
          stationdetails: request.yar.get('stationdetails'),
          maplocation,
          updatedTime,
          selectedYear: request.yar.get('selectedYear'),
          displayBacklink: true,
          fullSearchQuery,
          apiparams,
          years,
          pollutantKeys: request.yar.get('stationdetails').pollutants,
          currentdate,
          downloadresult: request.yar.get('downloadresult'),
          hrefq: '/location/' + multiplelocID
        })
      }
    }
  }
}

export { stationDetailsController }
