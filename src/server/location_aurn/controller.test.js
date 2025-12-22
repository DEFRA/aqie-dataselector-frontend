import { locationaurnController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import Wreck from '@hapi/wreck'

// Mock Wreck
jest.mock('@hapi/wreck')

// Mock englishNew import to match controller usage
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
  let mockWreck

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      method: 'get',
      yar: {
        set: jest.fn(),
        get: jest.fn()
      },
      params: {},
      payload: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('location-aurn-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    // Mock Wreck.get
    mockWreck = jest.mocked(Wreck.get)
    mockWreck.mockResolvedValue({
      payload: Buffer.from(
        JSON.stringify({
          data: [
            { 'Local Authority Name': 'City of London' },
            { 'Local Authority Name': 'Westminster' },
            { 'Local Authority Name': 'Tower Hamlets' }
          ]
        })
      )
    })
  })

  describe('GET requests', () => {
    it('should set session values and render the view with correct data', async () => {
      mockRequest.method = 'get'
      const result = await locationaurnController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')

      expect(mockH.view).toHaveBeenCalledWith('location_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset',
        laResult: {
          data: [
            { 'Local Authority Name': 'City of London' },
            { 'Local Authority Name': 'Westminster' },
            { 'Local Authority Name': 'Tower Hamlets' }
          ]
        },
        localAuthorityNames: ['City of London', 'Westminster', 'Tower Hamlets']
      })
      expect(result).toBe('location-aurn-view-response')
    })

    it('should set displayBacklink to true and hrefq to correct back URL', async () => {
      mockRequest.method = 'get'
      await locationaurnController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      )
    })

    it('should call local authority API and include results in view', async () => {
      mockRequest.method = 'get'
      await locationaurnController.handler(mockRequest, mockH)

      expect(mockWreck).toHaveBeenCalledWith(
        'https://www.laqmportal.co.uk/xapi/getLocalAuthorities/json',
        {
          headers: {
            'X-API-Key': '5444af89cc52380a81111d5623ea74d5',
            'X-API-PartnerId': '1035'
          }
        }
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: expect.objectContaining({
            data: expect.arrayContaining([
              { 'Local Authority Name': 'City of London' }
            ])
          }),
          localAuthorityNames: expect.arrayContaining([
            'City of London',
            'Westminster',
            'Tower Hamlets'
          ])
        })
      )
    })

    it('should handle API error gracefully', async () => {
      mockWreck.mockRejectedValue(new Error('API Error'))
      mockRequest.method = 'get'

      await locationaurnController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: { data: [] },
          localAuthorityNames: []
        })
      )
    })
  })

  describe('POST requests - Validation', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('should return error when no location option is selected', async () => {
      mockRequest.payload = {}

      await locationaurnController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Select an option before continuing',
                href: '#location-2'
              }
            ],
            details: { location: 'Select an option before continuing' }
          },
          formData: {}
        })
      )
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
          }
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
          }
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
          }
        })
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
      // Mock payload that would be processed and set selectedLocations
      mockRequest.payload = {
        location: 'la',
        'selected-locations': ['City of London', 'Westminster'],
        selectedLocations: ['City of London', 'Westminster']
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
            { 'Local Authority Name': 'City of London' },
            { 'Local Authority Name': 'Westminster' },
            { 'Local Authority Name': 'Tower Hamlets' }
          ]
        },
        localAuthorityNames: ['City of London', 'Westminster', 'Tower Hamlets']
      })
      expect(result).toBe('location-aurn-view-response')
    })

    it('should handle malformed API response', async () => {
      mockWreck.mockResolvedValue({
        payload: Buffer.from('invalid json')
      })
      mockRequest.method = 'get'

      await locationaurnController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: { data: [] },
          localAuthorityNames: []
        })
      )
    })

    it('should preserve form data when validation fails', async () => {
      mockRequest.method = 'post'
      mockRequest.payload = { location: 'countries', someField: 'someValue' }

      await locationaurnController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          formData: { location: 'countries', someField: 'someValue' }
        })
      )
    })
  })
})
