jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Location Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

jest.mock('~/src/server/common/helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: jest.fn(() =>
    Promise.resolve([
      200,
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
  let locationaurnController
  let mockRequest
  let mockH
  let mockConfigGet
  let catchProxyFetchError

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset module state so module-level cache in controller doesn't leak between tests
    jest.resetModules()

    mockRequest = {
      method: 'get',
      yar: { set: jest.fn(), get: jest.fn().mockReturnValue(null) },
      params: {},
      payload: {},
      query: {},
      path: '/location_aurn',
      headers: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('location-aurn-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  async function loadController() {
    ;({ locationaurnController } = await import('./controller.js'))
    ;({
      config: { get: mockConfigGet }
    } = await import('~/src/config/config.js'))
    ;({ catchProxyFetchError } = await import(
      '~/src/server/common/helpers/catch-proxy-fetch-error.js'
    ))

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
  }

  describe('GET requests', () => {
    it('renders with API data and preserves session prepopulation', async () => {
      await loadController()
      const result = await locationaurnController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')

      expect(mockH.view).toHaveBeenCalledWith('location_aurn/index', {
        pageTitle: 'Test Location Page',
        heading: 'Test Heading',
        texts: ['Test text 1', 'Test text 2'],
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
        laqmUnavailable: false,
        laqmUnavailableReason: undefined,
        formData: {}
      })
      expect(result).toBe('location-aurn-view-response')
    })

    it('handles API error via catchProxyFetchError and returns empty data', async () => {
      await loadController()
      catchProxyFetchError.mockResolvedValueOnce([500, null])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: expect.objectContaining({
            data: [],
            _meta: { unavailable: true, reason: 'non-200' }
          }),
          localAuthorityNames: [],
          laqmUnavailable: true,
          laqmUnavailableReason: 'non-200',
          formData: {}
        })
      )
    })

    it('handles malformed response structure', async () => {
      await loadController()
      catchProxyFetchError.mockResolvedValueOnce([200, 'not-an-object'])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: expect.objectContaining({
            data: [],
            _meta: { unavailable: true, reason: 'bad-payload' }
          }),
          localAuthorityNames: [],
          laqmUnavailable: true,
          laqmUnavailableReason: 'bad-payload',
          formData: {}
        })
      )
    })

    it('pre-populates countries from session', async () => {
      await loadController()
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
      await loadController()
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

    it('renders no-JS template when nojs query param is present', async () => {
      await loadController()
      mockRequest.query = { nojs: 'true' }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index_nojs',
        expect.objectContaining({
          pageTitle: 'Test Location Page',
          localAuthorityNames: [
            'City of London',
            'Westminster',
            'Tower Hamlets'
          ]
        })
      )
    })

    it('renders no-JS template when path includes nojs', async () => {
      await loadController()
      mockRequest.path = '/location-aurn/nojs'
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index_nojs',
        expect.objectContaining({
          pageTitle: 'Test Location Page'
        })
      )
    })

    it('renders JS template by default', async () => {
      await loadController()
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          pageTitle: 'Test Location Page'
        })
      )
    })
  })

  describe('POST requests - Validation', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('countries selected but none chosen', async () => {
      await loadController()
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

    it('local authority selected but none provided', async () => {
      await loadController()
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
      await loadController()
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
      await loadController()
      mockRequest.payload = {
        location: 'la',
        'selected-locations': ['City of London', 'city of london']
      }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: {
            list: expect.arrayContaining([
              {
                text: 'Remove duplicate local authorities',
                href: '#my-autocomplete'
              }
            ]),
            details: { 'local-authority': 'Remove duplicate local authorities' }
          },
          formData: {
            location: 'la',
            'selected-locations': ['City of London', 'city of london']
          }
        })
      )
    })

    it('too many local authorities (>10)', async () => {
      await loadController()
      mockRequest.payload = {
        location: 'la',
        'selected-locations': new Array(11).fill('City of London')
      }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              {
                text: 'You can only select up to 10 local authorities',
                href: '#my-autocomplete'
              }
            ])
          }),
          formData: expect.objectContaining({ location: 'la' })
        })
      )
    })

    it('preserves form data when validation fails', async () => {
      await loadController()
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

    it('renders no-JS template when validation fails and path includes nojs', async () => {
      await loadController()
      mockRequest.path = '/location-aurn/nojs'
      mockRequest.payload = { location: 'countries' }
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index_nojs',
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
  })

  describe('POST requests - Success', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('handles countries selection and redirects', async () => {
      await loadController()
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

    it('handles single country selection and redirects', async () => {
      await loadController()
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

    it('handles local authorities selection and redirects with LA IDs', async () => {
      await loadController()
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
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLAIDs', '1,2')
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

    it('handles local authorities without LA IDs gracefully', async () => {
      await loadController()
      catchProxyFetchError.mockResolvedValueOnce([
        200,
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
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocations', [
        'City of London'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedLocation',
        'Local Authorities: City of London'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLAIDs', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'Location',
        'LocalAuthority'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
        'City of London'
      ])
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })
  })

  describe('Edge cases', () => {
    it('default fallback for non-GET/POST returns view with API data (JS version)', async () => {
      await loadController()
      mockRequest.method = 'put'
      const result = await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('location_aurn/index', {
        pageTitle: 'Test Location Page',
        heading: 'Test Heading',
        texts: ['Test text 1', 'Test text 2'],
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

    it('default fallback for non-GET/POST returns no-JS view when nojs in path', async () => {
      await loadController()
      mockRequest.method = 'put'
      mockRequest.path = '/location-aurn/nojs'
      const result = await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('location_aurn/index_nojs', {
        pageTitle: 'Test Location Page',
        heading: 'Test Heading',
        texts: ['Test text 1', 'Test text 2'],
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

    it('missing config values returns empty', async () => {
      await loadController()
      mockConfigGet.mockReturnValue(undefined)
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

    it('null payload from API returns empty names', async () => {
      await loadController()
      catchProxyFetchError.mockResolvedValueOnce([200, null])
      await locationaurnController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'location_aurn/index',
        expect.objectContaining({
          laResult: expect.objectContaining({
            data: [],
            _meta: { unavailable: true, reason: 'bad-payload' }
          }),
          localAuthorityNames: [],
          formData: {}
        })
      )
    })

    it('extracts local authority names from API response', async () => {
      await loadController()
      const mockApiData = {
        data: [
          { 'Local Authority Name': 'Test Authority 1', 'LA ID': 'T1' },
          { 'Local Authority Name': 'Test Authority 2', 'LA ID': 'T2' },
          { 'Local Authority Name': 'Test Authority 3', 'LA ID': 'T3' }
        ]
      }
      catchProxyFetchError.mockResolvedValueOnce([200, mockApiData])
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
  })
})
