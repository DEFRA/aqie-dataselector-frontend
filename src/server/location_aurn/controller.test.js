import { locationaurnController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import axios from 'axios'

// Mock axios (controller uses axios.get)
jest.mock('axios')

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

describe('locationaurnController', () => {
  let mockRequest
  let mockH
  let mockConfig

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

    mockConfig = jest.mocked(config.get)
    mockConfig.mockImplementation((key) => {
      switch (key) {
        case 'laqmAPIkey':
          return 'test-api-key'
        case 'laqmAPIPartnerId':
          return 'test-partner-id'
        default:
          return undefined
      }
    })

    // Default axios.get mock: 200 + JSON body
    axios.get.mockResolvedValue({
      status: 200,
      data: {
        data: [
          { 'Local Authority Name': 'City of London', 'LA ID': '1' },
          { 'Local Authority Name': 'Westminster', 'LA ID': '2' },
          { 'Local Authority Name': 'Tower Hamlets', 'LA ID': '3' }
        ]
      }
    })
  })

  describe('GET requests', () => {
    it('should set session values and render the view with correct data', async () => {
      mockRequest.method = 'get'
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

    it('should handle API error gracefully and return empty data', async () => {
      axios.get.mockRejectedValue(new Error('API Error'))
      mockRequest.method = 'get'

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

    it('should handle malformed response structure gracefully', async () => {
      axios.get.mockResolvedValue({ status: 200, data: 'not-an-object' })
      mockRequest.method = 'get'
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

    it('should handle HTTP error status gracefully', async () => {
      axios.get.mockResolvedValue({ status: 500, data: { message: 'Internal Server Error' } })
      mockRequest.method = 'get'
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

    it('should pre-populate form with existing session data for countries', async () => {
      mockRequest.method = 'get'
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
        formData: {
          location: 'countries',
          country: ['England', 'Wales']
        }
      })
    })

    it('should pre-populate form with existing session data for local authorities', async () => {
      mockRequest.method = 'get'
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
        formData: {
          location: 'la',
          'selected-locations': ['City of London', 'Westminster']
        }
      })
    })
  })

  describe('POST requests - Validation', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('should return error when countries is selected but no country is chosen', async () => {
      mockRequest.payload = { location: 'countries' }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              { text: 'Select at least one country', href: '#country-england' }
            ],
            details: { country: 'Select at least one country' }
          },
          formData: { location: 'countries' }
        })
      )
    })

    it('should return error when countries is selected with empty array', async () => {
      mockRequest.payload = { location: 'countries', country: [] }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              { text: 'Select at least one country', href: '#country-england' }
            ],
            details: { country: 'Select at least one country' }
          },
          formData: { location: 'countries', country: [] }
        })
      )
    })

    it('should return error when local authority is selected but no authority is provided', async () => {
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

    it('should return error when invalid local authorities are selected', async () => {
      mockRequest.payload = {
        location: 'la',
        'selected-locations': ['Invalid Authority', 'Another Invalid']
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
            'selected-locations': ['Invalid Authority', 'Another Invalid']
          }
        })
      )
    })

    it('should return error when duplicate local authorities are selected', async () => {
      mockRequest.payload = {
        location: 'la',
        'selected-locations': [
          'City of London',
          'city of london',
          'Westminster'
        ]
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
          }
        })
      )
    })

    it('should preserve form data when validation fails', async () => {
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

  describe('POST requests - Success scenarios', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('should handle countries selection successfully', async () => {
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

    it('should handle single country selection successfully', async () => {
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

    it('should handle local authorities selection successfully', async () => {
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

    it('should handle local authorities without LA IDs gracefully', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: {
          data: [
            { 'Local Authority Name': 'City of London' },
            { 'Local Authority Name': 'Westminster' }
          ]
        }
      })
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
    it('should handle default fallback when method is neither GET nor POST', async () => {
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

    it('should handle empty API response', async () => {
      axios.get.mockResolvedValue({ status: 200, data: { data: [] } })
      mockRequest.method = 'get'
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

    it('should handle missing config values', async () => {
      mockConfig.mockReturnValue(undefined)
      axios.get.mockRejectedValue(new Error('Missing API key'))
      mockRequest.method = 'get'
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

    it('should handle null payload from API', async () => {
      axios.get.mockResolvedValue({ status: 200, data: undefined })
      mockRequest.method = 'get'
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
  })

  describe('API Integration', () => {
    it('should extract local authority names correctly from API response', async () => {
      const mockApiData = {
        data: [
          { 'Local Authority Name': 'Test Authority 1', 'LA ID': 'T1' },
          { 'Local Authority Name': 'Test Authority 2', 'LA ID': 'T2' },
          { 'Local Authority Name': 'Test Authority 3', 'LA ID': 'T3' }
        ]
      }
      axios.get.mockResolvedValue({ status: 200, data: mockApiData })
      mockRequest.method = 'get'
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

    it('should handle API response without Local Authority Name field', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [{ Name: 'Authority 1', 'LA ID': '1' }, { Name: 'Authority 2', 'LA ID': '2' }] }
      })
      mockRequest.method = 'get'
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({ localAuthorityNames: [] })
      )
    })
  })
})
