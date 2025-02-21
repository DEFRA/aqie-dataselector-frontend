import { english } from '~/src/server/data/en/homecontent.js'

const monitoringStationController = {
  handler: (request, h) => {
    // const { query } = request

    // console.log("request.quesry in monst",request.query)
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')
    if (request != null) {
      //   const x = query
      // const invalidSearchEntry = false
    }

    return h.view('monitoring-station/index', {
      pageTitle: english.monitoringStation.pageTitle,
      title: english.monitoringStation.title,
      serviceName: english.monitoringStation.serviceName,
      paragraphs: english.monitoringStation.paragraphs
    })
  }
}

export { monitoringStationController }
