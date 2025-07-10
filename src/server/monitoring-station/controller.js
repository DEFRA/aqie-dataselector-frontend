import { english } from '~/src/server/data/en/homecontent.js'

const monitoringStationController = {
  handler: (request, h) => {
    request.yar.set('errors', '')
    request.yar.set('errorMessage', '')

    return h.view('monitoring-station/index', {
      pageTitle: english.monitoringStation.pageTitle,
      title: english.monitoringStation.title,
      serviceName: english.monitoringStation.serviceName,
      paragraphs: english.monitoringStation.paragraphs
    })
  }
}

export { monitoringStationController }
