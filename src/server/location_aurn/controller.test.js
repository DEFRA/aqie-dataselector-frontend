import { locationaurnController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'

// Mock config
jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))

// Mock logger options and logger
jest.mock('~/src/server/common/helpers/logging/logger-options.js', () => ({
  loggerOptions: {
    enabled: true,
    ignorePaths: ['/health'],
    redact: { paths: [] }
  }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}))

// Mock englishNew
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Location Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

// Mock proxy helpers used by controller
jest.mock('~/src/server/common/helpers/proxy.js', () => ({
  proxyFetch: jest.fn()
}))

// IMPORTANT: controller does `const [responselaqm] = await catchProxyFetchError(...)`
// so return a single-element array where element 0 is the response object
jest.mock('~/src/server/common/helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: jest.fn(() =>
    Promise.resolve([
      {
        data: [
          { 'Local Authority Name': 'City of London', 'LA ID': '1' },
          { 'Local Authority Name': 'Westminster', 'LA ID': '2' },
          { 'Local Authority Name': 'Tower Hamlets', 'LA ID': '3' }
        ]
      }
    ])
  )
}))

describe('locationaurnController', () => {
  let mockRequest
  let mockH
  let mockConfigGet
  const { catchProxyFetchError } = jest.requireMock(
    '~/src/server/common/helpers/catch-proxy-fetch-error.js'
  )

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      method: 'get',
      yar: { set: jest.fn(), get: jest.fn().mockReturnValue(null) },
      params: {},
      payload: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('location-aurn-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    mockConfigGet = jest.mocked(config.get)
    mockConfigGet.mockImplementation((key) => {
      switch (key) {
        case 'laqmAPIkey':
          return 'test-api-key'
        case 'laqmAPIPartnerId':
          return 'test-partner-id'
        default:
          return undefined
      }
    })
  })

  describe('GET requests', () => {
    it('renders with API data', async () => {
      const result = await locationaurnController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')

      expect(mockH.view).toHaveBeenCalledWith('location_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset',
        laResult: {
          data: [
            { 'Local Authority Name': 'City of London', 'LA ID': '1' },
            { 'Local Authority Name': 'Westminster', 'LA ID': '2' },
            { 'Local Authority Name': 'Tower Hamlets', 'LA ID': '3' }
          ]
        },
        localAuthorityNames: ['City of London', 'Westminster', 'Tower Hamlets'],
        formData: {}
      })
      expect(result).toBe('location-aurn-view-response')
    })

    it('handles API error via catchProxyFetchError and returns empty data', async () => {
      catchProxyFetchError.mockResolvedValueOnce([null])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: null,
          localAuthorityNames: [],
          formData: {}
        })
      )
    })

    it('handles malformed response structure', async () => {
      catchProxyFetchError.mockResolvedValueOnce(['not-an-object'])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: 'not-an-object',
          localAuthorityNames: [],
          formData: {}
        })
      )
    })

    it('pre-populates countries from session', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'Location':
            return 'Country'
          case 'selectedCountries':
            return ['England', 'Wales']
          case 'selectedlocation':
            return ['England', 'Wales']
          default:
            return null
        }
      })
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          formData: { location: 'countries', country: ['England', 'Wales'] }
        })
      )
    })

    it('pre-populates local authorities from session', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'Location':
            return 'LocalAuthority'
          case 'selectedLocations':
            return ['City of London', 'Westminster']
          default:
            return null
        }
      })
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          formData: {
            location: 'la',
            'selected-locations': ['City of London', 'Westminster']
          }
        })
      )
    })
  })

  describe('POST requests - Validation', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('countries selected but none chosen', async () => {
      mockRequest.payload = { location: 'countries' }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              { text: 'Select at least one country', href: '#country-england' }
            ],
            details: { country: 'Select at least one country' } // controller sets details
          },
          formData: { location: 'countries' }
          // laResult and localAuthorityNames are present; we don’t assert them explicitly
        })
      )
    })

    it('local authority selected but none provided', async () => {
      mockRequest.payload = { location: 'la' }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Add at least one local authority',
                href: '#my-autocomplete'
              }
            ],
            details: { 'local-authority': 'Add at least one local authority' }
          },
          formData: { location: 'la' }
        })
      )
    })

    it('invalid local authorities', async () => {
      mockRequest.payload = {
        location: 'la',
        'selected-locations': ['Invalid Authority']
      }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Select local authorities from the list',
                href: '#my-autocomplete'
              }
            ],
            details: {
              'local-authority': 'Select local authorities from the list'
            }
          },
          formData: {
            location: 'la',
            'selected-locations': ['Invalid Authority']
          }
        })
      )
    })

    it('duplicate local authorities', async () => {
      mockRequest.payload = {
        location: 'la',
        'selected-locations': ['City of London', 'city of london']
      }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Remove duplicate local authorities',
                href: '#my-autocomplete'
              }
            ],
            details: { 'local-authority': 'Remove duplicate local authorities' }
          },
          formData: {
            location: 'la',
            'selected-locations': ['City of London', 'city of london']
          }
        })
      )
    })

    it('preserves form data when validation fails', async () => {
      const payloadData = {
        location: 'countries',
        someField: 'someValue',
        country: []
      }
      mockRequest.payload = payloadData
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({ formData: payloadData })
      )
    })
  })

  describe('POST requests - Success', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('handles countries selection', async () => {
      mockRequest.payload = {
        location: 'countries',
        country: ['England', 'Wales']
      }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedCountries', [
        'England',
        'Wales'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedLocation',
        'Countries: England, Wales'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('Location', 'Country')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
        'England',
        'Wales'
      ])
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles single country selection', async () => {
      mockRequest.payload = { location: 'countries', country: 'Scotland' }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedCountries', [
        'Scotland'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedLocation',
        'Countries: Scotland'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('Location', 'Country')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
        'Scotland'
      ])
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles local authorities selection', async () => {
      mockRequest.payload = {
        location: 'la',
        'selected-locations': ['City of London', 'Westminster']
      }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocations', [
        'City of London',
        'Westminster'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedLocation',
        'Local Authorities: City of London, Westminster'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'Location',
        'LocalAuthority'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
        'City of London',
        'Westminster'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLAIDs', '1,2')
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles local authorities without LA IDs gracefully', async () => {
      // Mock API returning items without LA ID
      catchProxyFetchError.mockResolvedValueOnce([
        {
          data: [
            { 'Local Authority Name': 'City of London' },
            { 'Local Authority Name': 'Westminster' }
          ]
        }
      ])
      mockRequest.payload = {
        location: 'la',
        'selected-locations': ['City of London']
      }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLAIDs', '')
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })
  })

  describe('Edge cases', () => {
    it('default fallback for non-GET/POST', async () => {
      mockRequest.method = 'put'
      const result = await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('location_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset',
        laResult: {
          data: [
            { 'Local Authority Name': 'City of London', 'LA ID': '1' },
            { 'Local Authority Name': 'Westminster', 'LA ID': '2' },
            { 'Local Authority Name': 'Tower Hamlets', 'LA ID': '3' }
          ]
        },
        localAuthorityNames: ['City of London', 'Westminster', 'Tower Hamlets']
      })
      expect(result).toBe('location-aurn-view-response')
    })

    it('empty API response', async () => {
      catchProxyFetchError.mockResolvedValueOnce([{ data: [] }])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: { data: [] },
          localAuthorityNames: [],
          formData: {}
        })
      )
    })

    it('missing config values', async () => {
      mockConfigGet.mockReturnValue(undefined)
      catchProxyFetchError.mockResolvedValueOnce([null])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: null,
          localAuthorityNames: [],
          formData: {}
        })
      )
    })

    it('null payload from API', async () => {
      catchProxyFetchError.mockResolvedValueOnce([null])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: null,
          localAuthorityNames: [],
          formData: {}
        })
      )
    })
  })

  describe('API Integration', () => {
    it('extracts local authority names from API response', async () => {
      const mockApiData = {
        data: [
          { 'Local Authority Name': 'Test Authority 1', 'LA ID': 'T1' },
          { 'Local Authority Name': 'Test Authority 2', 'LA ID': 'T2' },
          { 'Local Authority Name': 'Test Authority 3', 'LA ID': 'T3' }
        ]
      }
      catchProxyFetchError.mockResolvedValueOnce([mockApiData])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: mockApiData,
          localAuthorityNames: [
            'Test Authority 1',
            'Test Authority 2',
            'Test Authority 3'
          ]
        })
      )
    })

    it('handles API response without Local Authority Name field', async () => {
      catchProxyFetchError.mockResolvedValueOnce([
        {
          data: [
            { Name: 'Authority 1', 'LA ID': '1' },
            { Name: 'Authority 2', 'LA ID': '2' }
          ]
        }
      ])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({ localAuthorityNames: [] })
      )
    })
  })
})
