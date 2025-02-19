import { english } from '~/src/server/data/en/homecontent.js'

const stationDetailsController = {
  handler: (request, h) => {
    // const { query } = request

    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    if (request != null) {
      const MonitoringstResult = request.yar.get('MonitoringstResult')

      const result = MonitoringstResult.getmonitoringstation
      // console.log("name result",result)

      for (const x of result) {
        if (x.id === request.params.id) {
          request.yar.set('stationdetails', x)
          // console.log("locationname",locationname)
        }
      }
    }

    return h.view('stationdetails/index', {
      pageTitle: english.monitoringStation.pageTitle,
      title: english.monitoringStation.title,
      serviceName: english.monitoringStation.serviceName,
      stationdetails: request.yar.get('stationdetails')
    })
  }
}

export { stationDetailsController }
