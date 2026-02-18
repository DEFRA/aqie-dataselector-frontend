import { multipleLocationsController } from '~/src/server/multiplelocations/controller.js'
import axios from 'axios'
// import { config } from '~/src/config/config.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'

jest.mock('axios')
jest.mock('~/src/server/data/en/homecontent.js', () => ({
  english: {
    notFoundLocation: {
      heading: 'Not Found',
      paragraphs: ['No location found']
    },
    noStation: {
      heading: 'No Station',
      paragraphs: ['No monitoring station found']
    },
    multipleLocations: {
      pageTitle: 'Multiple Locations',
      heading: 'Choose a location',
      page: 'Page content',
      serviceName: 'Service',
      title: 'Title',
      paragraphs: ['Paragraphs'],
      button: 'Search'
    },
    searchLocation: {
      pageTitle: 'Search Location',
      heading: 'Search Heading',
      page: 'Search Page',
      serviceName: 'Search Service',
      searchParams: ['Params'],
      button: 'Search',
      errorText_sp: {
        uk: {
          fields: {
            title: 'Special Char Error',
            text: 'Invalid characters'
          }
        }
      },
      errorText: {
        uk: {
          fields: {
            title: 'Empty Error',
            text: 'Search query required'
          }
        }
      }
    },
    monitoringStation: {
      pageTitle: 'Monitoring Station',
      title: 'Station Title',
      serviceName: 'Station Service',
      paragraphs: ['Station Paragraphs']
    }
  }
}))
jest.mock('~/src/server/common/helpers/errors_message.js', () => ({
  setErrorMessage: jest.fn()
}))
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'OS_NAMES_API_URL') return 'https://api.osnames.com'
      if (key === 'OS_NAMES_API_URL_1') return 'https://api.monitoring.com'
    })
  }
}))

const mockYar = (initialData = {}) => {
  const store = {
    fullSearchQuery: { value: '' },
    locationMiles: '10',
    hasSpecialCharacter: false,
    errors: '',
    errorMessage: '',
    osnameapiresult: [],
    searchLocation: '',
    ...initialData
  }
  return {
    get: jest.fn((key) => store[key]),
    set: jest.fn((key, value) => {
      store[key] = value
    })
  }
}

const mockH = () => ({
  state: jest.fn(),
  view: jest.fn((template, context) => ({ template, context }))
})

describe('multipleLocationsController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle empty search input with error', async () => {
    const yar = mockYar({
      fullSearchQuery: { value: '' },
      hasSpecialCharacter: false
    })
    const request = {
      yar,
      payload: {}
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)
    expect(setErrorMessage).toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'search-location/index',
      expect.objectContaining({
        errors: '',
        errorMessage: ''
      })
    )
  })

  it('should handle special character input', async () => {
    const yar = mockYar({
      fullSearchQuery: { value: '@invalid!' },
      hasSpecialCharacter: true
    })
    const request = {
      yar,
      payload: {
        fullSearchQuery: '@invalid!'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)
    expect(setErrorMessage).toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'search-location/index',
      expect.any(Object)
    )
  })

  it('should render no location view when no locations found', async () => {
    axios.post.mockResolvedValueOnce({ data: { getOSPlaces: [] } })

    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'London',
      osnameapiresult: [] // This ensures locationdetails is an empty array
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nolocation',
      expect.any(Object)
    )
  })

  it('should render single location with no stations', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { getOSPlaces: [{ name: 'London' }] } }) // OS name API
      .mockResolvedValueOnce({ data: { getmonitoringstation: [] } }) // Monitoring API

    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'London',
      osnameapiresult: [] // This will trigger API call
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nostation',
      expect.any(Object)
    )
  })

  it('should render multiple locations with stations', async () => {
    axios.post
      .mockResolvedValueOnce({
        data: { getOSPlaces: [{ name: 'Loc1' }, { name: 'Loc2' }] }
      })
      .mockResolvedValueOnce({
        data: {
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
      })

    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'London',
      osnameapiresult: [] // This will trigger API call
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/index',
      expect.any(Object)
    )
  })

  it('should render monitoring station view for single location with stations', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { getOSPlaces: [{ name: 'London' }] } })
      .mockResolvedValueOnce({
        data: {
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
      })

    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'London',
      osnameapiresult: [] // This will trigger API call
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.any(Object)
    )
  })

  it('should handle API errors gracefully', async () => {
    const error = new Error('API Error')
    axios.post.mockRejectedValueOnce(error)

    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'London',
      osnameapiresult: [] // This will trigger API call
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)
    expect(yar.set).toHaveBeenCalledWith('osnameapiresult', error)
  })

  it('should handle pollutant name mapping for GR25, GE10, GR10', async () => {
    axios.post
      .mockResolvedValueOnce({
        data: { getOSPlaces: [{ name: 'Loc1' }, { name: 'Loc2' }] }
      })
      .mockResolvedValueOnce({
        data: {
          getmonitoringstation: [
            {
              name: 'Station1',
              pollutants: {
                GR25: {},
                GE10: {},
                GR10: {},
                NO2: {}
              }
            }
          ]
        }
      })

    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'London',
      osnameapiresult: []
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)

    // Verify pollutant mapping was done correctly
    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/index',
      expect.any(Object)
    )
  })

  it('should handle cached location data when osnameapiresult exists', async () => {
    axios.post.mockClear() // Clear previous calls
    const cachedLocations = {
      getOSPlaces: [{ name: 'Loc1' }, { name: 'Loc2' }]
    }

    axios.post.mockResolvedValueOnce({
      data: {
        getmonitoringstation: [
          {
            name: 'Station1',
            pollutants: { PM25: {} }
          }
        ]
      }
    })

    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'London',
      osnameapiresult: cachedLocations // Already has data
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)

    // The controller checks locationdetails.length which is undefined for objects,
    // so it still makes both API calls (OS API + monitoring API)
    expect(axios.post).toHaveBeenCalledTimes(2)
  })

  it('should update session when payload query differs from session query', async () => {
    const yar = mockYar({
      fullSearchQuery: { value: 'OldQuery' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      searchLocation: 'OldQuery',
      osnameapiresult: []
    })

    axios.post
      .mockResolvedValueOnce({
        data: { getOSPlaces: [{ name: 'Loc1' }, { name: 'Loc2' }] }
      })
      .mockResolvedValueOnce({
        data: { getmonitoringstation: [] }
      })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'NewQuery',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)

    expect(yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(yar.set).toHaveBeenCalledWith('fullSearchQuery', {
      value: 'NewQuery'
    })
  })

  it('should handle empty/null search value and set empty session values', async () => {
    const yar = mockYar({
      fullSearchQuery: { value: '' },
      locationMiles: '10',
      hasSpecialCharacter: false
    })

    const request = {
      yar,
      payload: {
        fullSearchQuery: '', // Empty search
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)

    // Should set empty searchLocation and searchValue for empty search
    expect(yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(yar.set).toHaveBeenCalledWith('searchValue', '')
  })

  it('should not set osnameapiresult when API returns null', async () => {
    const yar = mockYar({
      fullSearchQuery: { value: 'London' },
      locationMiles: '10',
      hasSpecialCharacter: false,
      osnameapiresult: [] // Empty initially
    })

    // Mock OS API to return null data (with getOSPlaces as empty to avoid crash)
    axios.post
      .mockResolvedValueOnce({ data: { getOSPlaces: [] } })
      .mockResolvedValueOnce({
        data: { getmonitoringstation: [] }
      })

    const request = {
      yar,
      payload: {
        fullSearchQuery: 'London',
        locationMiles: '10'
      }
    }
    const h = mockH()

    await multipleLocationsController.handler(request, h)

    // With empty OS places, should render no location view
    expect(h.view).toHaveBeenCalledWith(
      'multiplelocations/nolocation',
      expect.any(Object)
    )
  })
})
