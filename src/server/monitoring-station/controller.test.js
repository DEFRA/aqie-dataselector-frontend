import { monitoringStationController } from '~/src/server/monitoring-station/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('monitoringStationController', () => {
  let request, h

  beforeEach(() => {
    request = {
      yar: {
        set: jest.fn()
      }
    }

    h = {
      view: jest.fn()
    }
  })

  it('should reset session errors and render the monitoring station view', () => {
    const result = monitoringStationController.handler(request, h)

    expect(request.yar.set).toHaveBeenCalledWith('errors', '')
    expect(request.yar.set).toHaveBeenCalledWith('errorMessage', '')

    expect(h.view).toHaveBeenCalledWith('monitoring-station/index', {
      pageTitle: english.monitoringStation.pageTitle,
      title: english.monitoringStation.title,
      serviceName: english.monitoringStation.serviceName,
      paragraphs: english.monitoringStation.paragraphs
    })

    expect(result).toBe(
      h.view('monitoring-station/index', {
        pageTitle: english.monitoringStation.pageTitle,
        title: english.monitoringStation.title,
        serviceName: english.monitoringStation.serviceName,
        paragraphs: english.monitoringStation.paragraphs
      })
    )
  })
})
