import { english } from '~/src/server/data/en/homecontent.js'

const stationDetailsController = {
  handler: (request, h) => {
    // const { query } = request

    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')

    if (request != null) {
      const MonitoringstResult = request.yar.get('MonitoringstResult')

      if (MonitoringstResult !== null) {
        const result = MonitoringstResult.getmonitoringstation

        for (const x of result) {
          if (x.id === request.params.id) {
            request.yar.set('stationdetails', x)
            // console.log("locationname",locationname)
          }
        }
      }
    }
    const stndetails = request.yar.get('stationdetails')
    const updatedTime = ParseDateformat(stndetails.updated)

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

      // Output: "11:16 AM on 12 February 2025" // Output: "11:16 AM on 12 February 2025"
      return finalFormattedDate
      // console.log("formattedDate",formattedDate); // Output: "Wednesday, 12 February 2025 at 11:16:08 AM"
    }
    const lat = request.yar.get('stationdetails').location.coordinates[0]
    const longitude1 = request.yar.get('stationdetails').location.coordinates[1]
    const maplocation =
      'https://www.google.co.uk/maps?q=' + lat + ',' + longitude1
    const fullSearchQuery = request?.yar?.get('fullSearchQuery').value

    const locationMiles = request?.yar?.get('locationMiles')
    const multiplelocID = request?.yar?.get('locationID')
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
        displayBacklink: true,
        fullSearchQuery,
        hrefq: '/location/' + multiplelocID
      })
    }
  }
}

export { stationDetailsController }
