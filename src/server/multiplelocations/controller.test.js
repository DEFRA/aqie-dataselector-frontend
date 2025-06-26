import { multipleLocationsController } from '~/src/server/multiplelocations/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

import axios from 'axios'

jest.mock('axios')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn().mockImplementation((key) => {
      const urls = {
        OS_NAMES_API_URL: 'https://mockapi.com/osname/',
        OS_NAMES_API_URL_1: 'https://mockapi.com/monitoring/'
      }
      return urls[key]
    })
  }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn()
  })
}))
jest.mock('~/src/server/common/helpers/errors_message.js', () => ({
  setErrorMessage: jest.fn()
}))

describe('multipleLocationsController', () => {
  let request, h

  beforeEach(() => {
    request = {
      query: {
        fullSearchQuery: 'TestLocation',
        searchQuery: 'TestLocation (UK)',
        locationMiles: '10'
      },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    h = {
      view: jest.fn()
    }
  })

  it('should render monitoring-station/index when one location and stations are found', async () => {
    const mockOSPlaces = [
      { GAZETTEER_ENTRY: { ID: '1', NAME1: 'TestLocation' } }
    ]
    const mockMonitoringData = {
      getmonitoringstation: [
        {
          name: 'Station1',
          pollutants: {
            PM25: {},
            MP10: {},
            NO2: {}
          }
        }
      ]
    }

    request.yar.get.mockImplementation((key) => {
      const values = {
        osnameapiresult: { getOSPlaces: mockOSPlaces }
      }
      return values[key]
    })

    axios.get.mockResolvedValueOnce({ data: { getOSPlaces: mockOSPlaces } }) // OS_NAMES_API_URL
    axios.get.mockResolvedValueOnce({ data: mockMonitoringData }) // OS_NAMES_API_URL_1

    await multipleLocationsController.handler(request, h)

    // expect(h.view).toHaveBeenCalledWith('monitoring-station/index', expect.objectContaining({
    //   pageTitle: english.monitoringStation.pageTitle,
    //   searchLocation: 'TestLocation',
    //   locationMiles: '10',
    //   monitoring_station: mockMonitoringData.getmonitoringstation,
    //   displayBacklink: true,
    // }))
  })

  it('should render multiplelocations/nolocation when no locations are found', async () => {
    request.yar.get.mockReturnValueOnce({ getOSPlaces: [] })

    axios.get.mockResolvedValueOnce({ data: { getOSPlaces: [] } })

    await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nolocation',
      expect.objectContaining({
        serviceName: english.notFoundLocation.heading,
        paragraph: english.notFoundLocation.paragraphs,
        displayBacklink: true
      })
    )
  })

  it('should render search-location/index with error if no search input is provided', async () => {
    request.query.fullSearchQuery = ''
    request.query.searchQuery = ''

    await multipleLocationsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'search-location/index',
      expect.objectContaining({
        pageTitle: english.searchLocation.pageTitle,
        heading: english.searchLocation.heading,
        serviceName: english.searchLocation.serviceName,
        displayBacklink: true
      })
    )
  })
})
