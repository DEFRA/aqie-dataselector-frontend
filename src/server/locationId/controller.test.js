import { getLocationDetailsController } from '~/src/server/locationId/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

import axios from 'axios'

jest.mock('axios')
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn()
  })
}))

describe('getLocationDetailsController', () => {
  let request, h

  beforeEach(() => {
    request = {
      params: { id: '123' },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    h = {
      view: jest.fn()
    }
  })

  it('should render monitoring-station/index when monitoring stations are found', async () => {
    const mockOSPlaces = [
      {
        GAZETTEER_ENTRY: {
          ID: '123',
          NAME1: 'TestLocation'
        }
      }
    ]

    const mockMonitoringData = {
      getmonitoringstation: [
        {
          name: 'Station1',
          pollutants: {
            PM25: {},
            MP10: {}
          }
        }
      ]
    }

    request.yar.get.mockImplementation((key) => {
      const values = {
        osnameapiresult: { getOSPlaces: mockOSPlaces },
        fullSearchQuery: { value: 'testQuery' },
        locationMiles: '5'
      }
      return values[key]
    })

    axios.get.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        pageTitle: english.monitoringStation.pageTitle,
        searchLocation: 'TestLocation',
        locationMiles: '5',
        fullSearchQuery: 'testQuery'
      })
    )
  })

  it('should render multiplelocations/nostation when no monitoring stations are found', async () => {
    const mockOSPlaces = [
      {
        GAZETTEER_ENTRY: {
          ID: '123',
          NAME1: 'TestLocation'
        }
      }
    ]

    const mockMonitoringData = {
      getmonitoringstation: []
    }

    request.yar.get.mockImplementation((key) => {
      const values = {
        osnameapiresult: { getOSPlaces: mockOSPlaces },
        fullSearchQuery: { value: 'testQuery' },
        locationMiles: '5'
      }
      return values[key]
    })

    axios.get.mockResolvedValue({ data: mockMonitoringData })

    await getLocationDetailsController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nostation',
      expect.objectContaining({
        locationMiles: '5',
        searchLocation: 'TestLocation'
      })
    )
  })
})
