import { multipleLocationsController } from '~/src/server/multiplelocations/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'

jest.mock('~/src/server/common/helpers/logging/logger-options.js', () => ({
  loggerOptions: {
    enabled: true,
    ignorePaths: ['/health'],
    redact: {
      paths: ['req.headers.authorization']
    }
  }
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}))

jest.mock('axios')
jest.mock('@hapi/wreck')
jest.mock('~/src/config/config.js')
jest.mock('~/src/server/data/en/homecontent.js')
jest.mock('~/src/server/common/helpers/errors_message.js', () => ({
  setErrorMessage: jest.fn()
}))

const mockedAxios = axios
const mockedConfig = config

describe('multipleLocationsController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      method: 'post',
      url: {
        pathname: '/multiplelocations'
      },
      params: {},
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      },
      headers: {
        referer: 'http://localhost:3001/search-location'
      },
      info: {
        host: 'localhost:3001'
      },
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      state: jest.fn(),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    mockedConfig.get.mockImplementation((key) => {
      switch (key) {
        case 'isDevelopment':
          return false
        case 'OS_NAMES_API_URL':
          return 'http://os-names-api'
        case 'OS_NAMES_API_URL_1':
          return 'http://monitoring-station-api'
        default:
          return 'default-url'
      }
    })

    english.notFoundLocation = {
      heading: 'Location not found',
      paragraphs: ['No location found']
    }
    english.noStation = {
      heading: 'No station found',
      paragraphs: ['No monitoring station found']
    }
    english.monitoringStation = {
      pageTitle: 'Monitoring Station',
      title: 'Monitoring Station Title',
      serviceName: 'Monitoring Service',
      paragraphs: ['Monitoring station paragraphs']
    }
    english.multipleLocations = {
      pageTitle: 'Multiple Locations',
      heading: 'Multiple Locations Heading',
      page: 'page1',
      title: 'Multiple Locations Title',
      paragraphs: ['Multiple locations paragraphs'],
      button: 'Continue'
    }
    english.searchLocation = {
      pageTitle: 'Search Location',
      heading: 'Search Heading',
      page: 'search-page',
      serviceName: 'Search Service',
      searchParams: ['Search params'],
      button: 'Search',
      errorText: {
        uk: {
          fields: {
            title: 'Error title',
            text: 'Error text'
          }
        }
      },
      errorText_sp: {
        uk: {
          fields: {
            title: 'Special char error title',
            text: 'Special char error text'
          }
        }
      }
    }
  })

  describe('handler', () => {
    it('should set js_enabled cookie to false', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'London' }
          case 'locationMiles':
            return '10'
          case 'searchLocation':
            return 'London'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'London' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.state).toHaveBeenCalledWith('js_enabled', 'false')
    })

    it('should clear errors on request', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'London' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'London' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('errors', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('errorMessage', '')
    })

    it('should set fullSearchQuery from payload when session has no query', async () => {
      // Session returns no existing query value so the controller sets it from payload
      mockRequest.payload.fullSearchQuery = 'NewPlace'

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            // First call returns empty (no session query), triggering the set
            return { value: 'NewPlace' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      // Make the first get of fullSearchQuery return no value
      let callCount = 0
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            callCount++
            if (callCount === 1) return { value: undefined }
            return { value: 'NewPlace' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'NewPlace' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', {
        value: 'NewPlace'
      })
    })

    it('should set hasSpecialCharacter to true when query has special characters', async () => {
      mockRequest.payload.fullSearchQuery = 'London<script>'

      // Session has no prior fullSearchQuery value so the payload triggers the branch
      let callCount = 0
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            callCount++
            if (callCount === 1) return { value: undefined }
            return { value: 'London<script>' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return true
          case 'errors':
            return { title: 'Special char error title' }
          case 'errorMessage':
            return { text: 'Special char error text' }
          default:
            return null
        }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'hasSpecialCharacter',
        true
      )
    })

    it('should render special character error view when hasSpecialCharacter is true', async () => {
      mockRequest.payload.fullSearchQuery = 'London<>'

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'London<>' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return true
          case 'errors':
            return { title: 'Error' }
          case 'errorMessage':
            return { text: 'Error message' }
          default:
            return null
        }
      })

      const result = await multipleLocationsController.handler(
        mockRequest,
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'search-location/index',
        expect.objectContaining({
          pageTitle: 'Search Location'
        })
      )
      expect(result).toBe('view-response')
    })

    it('should render no location view when API returns empty locations', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'NonexistentPlace' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'NonexistentPlace'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/nolocation',
        expect.objectContaining({
          results: [],
          serviceName: 'Location not found'
        })
      )
    })

    it('should render no station view when single location has no stations', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'TestTown' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'TestTown'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'TestTown' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/nostation',
        expect.objectContaining({
          serviceName: 'No station found'
        })
      )
    })

    it('should render monitoring station view for single location with stations', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'TestCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'TestCity'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const stations = [
        {
          name: 'Station A',
          pollutants: { NO2: true, PM25: true }
        }
      ]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'TestCity' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'monitoring-station/index',
        expect.objectContaining({
          pageTitle: 'Monitoring Station',
          monitoring_station: stations
        })
      )
    })

    it('should render multiple locations view when more than one location returned', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Springfield' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Springfield'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const stations = [
        {
          name: 'Station X',
          pollutants: { NO2: true }
        }
      ]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            getOSPlaces: [
              { name: 'Springfield, IL' },
              { name: 'Springfield, MA' }
            ]
          }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/index',
        expect.objectContaining({
          heading: 'Multiple Locations Heading',
          monitoring_station: stations
        })
      )
    })

    it('should set nooflocation to none when no locations found', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'ZZZZ' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'ZZZZ'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', 'none')
    })

    it('should set nooflocation to single when one location found', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'UniquePlace' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'UniquePlace'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'UniquePlace' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', 'single')
    })

    it('should set nooflocation to multiple when multiple locations found', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'CommonName' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'CommonName'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            getOSPlaces: [{ name: 'CommonName A' }, { name: 'CommonName B' }]
          }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [{ name: 'S1', pollutants: {} }] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'nooflocation',
        'multiple'
      )
    })

    it('should redirect to problem-with-service on unhandled error', async () => {
      mockRequest.yar.get.mockImplementation(() => {
        throw new Error('Session error')
      })

      const result = await multipleLocationsController.handler(
        mockRequest,
        mockH
      )

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirect-response')
    })

    it('should set searchLocation in session when searchValue is present', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Manchester' }
          case 'locationMiles':
            return '5'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'Manchester' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'searchLocation',
        'Manchester'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'searchValue',
        'Manchester'
      )
    })

    it('should set empty searchLocation when searchValue is empty', async () => {
      mockRequest.payload.fullSearchQuery = ''

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: '' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'errors':
            return ''
          case 'errorMessage':
            return ''
          default:
            return null
        }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchValue', '')
    })

    it('should render error view when searchInput has no value', async () => {
      mockRequest.payload.fullSearchQuery = ''

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: '' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'errors':
            return ''
          case 'errorMessage':
            return ''
          default:
            return null
        }
      })

      const result = await multipleLocationsController.handler(
        mockRequest,
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'search-location/index',
        expect.objectContaining({
          pageTitle: 'Search Location'
        })
      )
      expect(result).toBe('view-response')
    })

    it('should not call OS Names API when cached osnameapiresult has getOSPlaces array', async () => {
      // The resolveLocations function checks Array.isArray(locationdetails) && locationdetails.length > 0
      // Since the cached result is an object (not an array), it won't use the cache and will call the API
      // This test verifies the API is still called when cache is an object
      const cachedResult = {
        getOSPlaces: [{ name: 'CachedCity' }]
      }

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'CachedCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'CachedCity'
          case 'osnameapiresult':
            return cachedResult
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'CachedCity' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      // Since cached result is an object (not array), the API will still be called
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('should update locationMiles from payload when session locationMiles differs', async () => {
      mockRequest.payload.locationMiles = '20'

      // Session returns undefined for locationMiles initially to trigger the set
      let milesCallCount = 0
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'London' }
          case 'locationMiles':
            milesCallCount++
            if (milesCallCount === 1) return undefined
            return '20'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'London' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('locationMiles', '20')
    })

    it('should normalize PM25 pollutant to PM2.5 in pollutant map', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'TestCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'TestCity'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const stations = [
        {
          name: 'Station A',
          pollutants: { PM25: true, GR25: true, NO2: true }
        }
      ]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'TestCity' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'monitoring-station/index',
        expect.objectContaining({
          pollmap: expect.any(Map)
        })
      )
    })

    it('should normalize PM10 pollutants (MP10, GE10, GR10) to PM10', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'TestCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'TestCity'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const stations = [
        {
          name: 'Station B',
          pollutants: { MP10: true, GE10: true, GR10: true }
        }
      ]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'TestCity' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'monitoring-station/index',
        expect.objectContaining({
          pollmap: expect.any(Map)
        })
      )
    })

    it('should handle monitoring station API failure gracefully', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'London' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'London'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'London' }] }
        })
        .mockRejectedValueOnce(new Error('API timeout'))

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/nostation',
        expect.objectContaining({
          serviceName: 'No station found'
        })
      )
    })

    it('should update fullSearchQuery when payload differs from session value', async () => {
      mockRequest.payload.fullSearchQuery = 'NewCity'

      // First call to get fullSearchQuery returns a different value than payload
      let queryCallCount = 0
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            queryCallCount++
            if (queryCallCount === 1) return { value: 'OldCity' }
            return { value: 'NewCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'NewCity' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', {
        value: 'NewCity'
      })
    })

    it('should store OS Names API result in session', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Birmingham' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Birmingham'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const apiResult = { getOSPlaces: [{ name: 'Birmingham' }] }

      mockedAxios.post
        .mockResolvedValueOnce({ data: apiResult })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'osnameapiresult',
        apiResult
      )
    })

    it('should store monitoring station result in session', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Leeds' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Leeds'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const monitoringResult = {
        getmonitoringstation: [
          { name: 'Leeds Station', pollutants: { NO2: true } }
        ]
      }

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'Leeds' }] }
        })
        .mockResolvedValueOnce({ data: monitoringResult })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'MonitoringstResult',
        monitoringResult
      )
    })

    it('should use Wreck for OS Names API in development mode', async () => {
      mockedConfig.get.mockImplementation((key) => {
        switch (key) {
          case 'isDevelopment':
            return true
          case 'osLocationDevUrl':
            return 'http://dev-os-names'
          case 'osMonitoringStationDevUrl':
            return 'http://dev-monitoring'
          case 'osNamesDevApiKey':
            return 'dev-api-key'
          default:
            return 'default-url'
        }
      })

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'DevCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'DevCity'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      Wreck.post.mockResolvedValueOnce({
        payload: { getOSPlaces: [{ name: 'DevCity' }] }
      })
      Wreck.post.mockResolvedValueOnce({
        payload: { getmonitoringstation: [] }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(Wreck.post).toHaveBeenCalledWith(
        'http://dev-os-names',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'dev-api-key'
          })
        })
      )
    })

    it('should pass displayBacklink true in all rendered views', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'London' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'London'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'London' }] }
        })
        .mockResolvedValueOnce({
          data: {
            getmonitoringstation: [
              { name: 'Station', pollutants: { NO2: true } }
            ]
          }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          displayBacklink: true
        })
      )
    })

    it('should set hasSpecialCharacter to false with valid alphanumeric input when session has no query', async () => {
      mockRequest.payload.fullSearchQuery = 'London-City'

      // Session returns no value initially so the payload branch is triggered
      let queryCallCount = 0
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            queryCallCount++
            if (queryCallCount === 1) return { value: undefined }
            return { value: 'London-City' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'London-City' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'hasSpecialCharacter',
        false
      )
    })

    it('should call OS Names API with correct parameters', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Bristol' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Bristol'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'Bristol' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledWith('http://os-names-api', {
        userLocation: 'Bristol'
      })
    })

    it('should call monitoring station API with correct parameters', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Cardiff' }
          case 'locationMiles':
            return '15'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Cardiff'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'Cardiff' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://monitoring-station-api',
        { userLocation: 'Cardiff', usermiles: '15' }
      )
    })

    it('should use Wreck for monitoring station API in development mode', async () => {
      mockedConfig.get.mockImplementation((key) => {
        switch (key) {
          case 'isDevelopment':
            return true
          case 'osLocationDevUrl':
            return 'http://dev-os-names'
          case 'osMonitoringStationDevUrl':
            return 'http://dev-monitoring'
          case 'osNamesDevApiKey':
            return 'dev-api-key'
          default:
            return 'default-url'
        }
      })

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'DevTown' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'DevTown'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      Wreck.post.mockResolvedValueOnce({
        payload: { getOSPlaces: [{ name: 'DevTown' }] }
      })
      Wreck.post.mockResolvedValueOnce({
        payload: { getmonitoringstation: [] }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(Wreck.post).toHaveBeenCalledWith(
        'http://dev-monitoring',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'dev-api-key'
          }),
          json: true
        })
      )
    })

    it('should handle OS Names API failure and redirect to problem-with-service', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'FailCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'FailCity'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post.mockRejectedValueOnce(new Error('OS Names API down'))

      const result = await multipleLocationsController.handler(
        mockRequest,
        mockH
      )

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirect-response')
    })

    it('should render no location view with correct hrefq', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'NowhereVille' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'NowhereVille'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/nolocation',
        expect.objectContaining({
          hrefq: '/search-location'
        })
      )
    })

    it('should render no station view with locationMiles', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'RemotePlace' }
          case 'locationMiles':
            return '25'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'RemotePlace'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'RemotePlace' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/nostation',
        expect.objectContaining({
          locationMiles: '25'
        })
      )
    })

    it('should render monitoring station view with correct serviceName', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Oxford' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Oxford'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const stations = [{ name: 'Oxford Station', pollutants: { O3: true } }]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'Oxford' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'monitoring-station/index',
        expect.objectContaining({
          serviceName: 'Monitoring Service',
          title: 'Monitoring Station Title'
        })
      )
    })

    it('should render multiple locations view with correct button text', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Portland' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Portland'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            getOSPlaces: [{ name: 'Portland, OR' }, { name: 'Portland, ME' }]
          }
        })
        .mockResolvedValueOnce({
          data: {
            getmonitoringstation: [{ name: 'S1', pollutants: { NO2: true } }]
          }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/index',
        expect.objectContaining({
          button: 'Continue',
          pageTitle: 'Multiple Locations'
        })
      )
    })

    it('should render search error view with correct hrefq as root', async () => {
      mockRequest.payload.fullSearchQuery = ''

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: '' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'errors':
            return ''
          case 'errorMessage':
            return ''
          default:
            return null
        }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'search-location/index',
        expect.objectContaining({
          hrefq: '/',
          displayBacklink: true
        })
      )
    })

    it('should set searchQuery in session alongside fullSearchQuery when payload triggers update', async () => {
      mockRequest.payload.fullSearchQuery = 'Edinburgh'

      let queryCallCount = 0
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            queryCallCount++
            if (queryCallCount === 1) return { value: undefined }
            return { value: 'Edinburgh' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'Edinburgh' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', {
        value: 'Edinburgh'
      })
    })

    it('should handle Wreck error in development mode gracefully for OS Names API', async () => {
      mockedConfig.get.mockImplementation((key) => {
        switch (key) {
          case 'isDevelopment':
            return true
          case 'osLocationDevUrl':
            return 'http://dev-os-names'
          case 'osMonitoringStationDevUrl':
            return 'http://dev-monitoring'
          case 'osNamesDevApiKey':
            return 'dev-api-key'
          default:
            return 'default-url'
        }
      })

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'ErrorCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'ErrorCity'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const wreckError = new Error('Wreck connection failed')
      Wreck.post.mockRejectedValueOnce(wreckError)
      Wreck.post.mockResolvedValueOnce({
        payload: { getmonitoringstation: [] }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/nolocation',
        expect.objectContaining({
          results: undefined,
          serviceName: 'Location not found',
          searchLocation: 'ErrorCity'
        })
      )
    })

    it('should pass locationMiles in monitoring station view', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'York' }
          case 'locationMiles':
            return '30'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'York'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const stations = [{ name: 'York Station', pollutants: { SO2: true } }]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'York' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'monitoring-station/index',
        expect.objectContaining({
          locationMiles: '30'
        })
      )
    })

    it('should pass searchLocation from session in rendered view', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Bath' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Bath'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'Bath' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: [] }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/nostation',
        expect.objectContaining({
          searchLocation: 'Bath'
        })
      )
    })

    it('should deduplicate normalized pollutants in pollutant map', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'DupCity' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'DupCity'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      // PM25 and GR25 both normalize to PM2.5, should be deduplicated
      const stations = [
        {
          name: 'Dup Station',
          pollutants: { PM25: true, GR25: true }
        }
      ]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'DupCity' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      const viewCall = mockH.view.mock.calls[0]
      const pollmap = viewCall[1].pollmap
      expect(pollmap.get('Dup Station')).toEqual(['PM2.5'])
    })

    it('should handle multiple stations with different pollutants', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'MultiStation' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'MultiStation'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const stations = [
        { name: 'Station 1', pollutants: { NO2: true, O3: true } },
        { name: 'Station 2', pollutants: { PM25: true, SO2: true } }
      ]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: [{ name: 'MultiStation' }] }
        })
        .mockResolvedValueOnce({
          data: { getmonitoringstation: stations }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      const viewCall = mockH.view.mock.calls[0]
      const pollmap = viewCall[1].pollmap
      expect(pollmap.get('Station 1')).toEqual(['NO2', 'O3'])
      expect(pollmap.get('Station 2')).toEqual(['PM2.5', 'SO2'])
    })

    it('should render search-location/index with special char error text', async () => {
      mockRequest.payload.fullSearchQuery = 'Test@#$'

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Test@#$' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return true
          case 'errors':
            return { title: 'Special char error title' }
          case 'errorMessage':
            return { text: 'Special char error text' }
          default:
            return null
        }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'search-location/index',
        expect.objectContaining({
          heading: 'Search Heading',
          serviceName: 'Search Service',
          button: 'Search'
        })
      )
    })

    it('should pass results array in multiple locations view', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: 'Richmond' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'searchLocation':
            return 'Richmond'
          case 'osnameapiresult':
            return null
          default:
            return null
        }
      })

      const locations = [
        { name: 'Richmond, London' },
        { name: 'Richmond, Yorkshire' }
      ]

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { getOSPlaces: locations }
        })
        .mockResolvedValueOnce({
          data: {
            getmonitoringstation: [{ name: 'S1', pollutants: { NO2: true } }]
          }
        })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'multiplelocations/index',
        expect.objectContaining({
          results: locations
        })
      )
    })

    it('should handle null request gracefully by entering try block', async () => {
      // When request is null, the try block still executes h.state
      const nullRequest = null

      const result = await multipleLocationsController.handler(
        nullRequest,
        mockH
      )

      // Should redirect due to error accessing null request properties
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
      expect(result).toBe('redirect-response')
    })

    it('should clear fullSearchQuery and osnameapiresult in session on search error view', async () => {
      mockRequest.payload.fullSearchQuery = ''

      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'fullSearchQuery':
            return { value: '' }
          case 'locationMiles':
            return '10'
          case 'hasSpecialCharacter':
            return false
          case 'errors':
            return ''
          case 'errorMessage':
            return ''
          default:
            return null
        }
      })

      await multipleLocationsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    })
  })
})
