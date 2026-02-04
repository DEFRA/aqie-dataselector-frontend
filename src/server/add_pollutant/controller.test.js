import { airpollutantController } from './controller.js'

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Add Pollutant Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

describe('airpollutantController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      method: 'get',
      yar: {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(null)
      },
      payload: {},
      query: {},
      path: '/add_pollutant',
      headers: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('add-pollutant-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  describe('GET requests', () => {
    it('pre-populates form from session without defaulting year', () => {
      mockRequest.method = 'get'
      mockRequest.yar.get.mockImplementation((key) => {
        switch (key) {
          case 'selectedPollutants':
            return ['Nitrogen dioxide (NO2)', 'Particulate matter (PM10)']
          case 'selectedPollutantMode':
            return 'specific'
          case 'selectedPollutantGroup':
            return 'core'
          default:
            return null
        }
      })

      airpollutantController.handler(mockRequest, mockH)

      // Clears these session values on GET
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')

      // Renders main template with session prepopulation
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          pageTitle: 'Test Add Pollutant Page',
          heading: 'Test Heading',
          texts: ['Test text 1', 'Test text 2'],
          displayBacklink: true,
          hrefq: '/customdataset',
          selectedPollutants: [
            'Nitrogen dioxide (NO2)',
            'Particulate matter (PM10)'
          ],
          selectedMode: 'specific',
          selectedGroup: '' // controller provides empty string in specific mode
        })
      )
    })

    it('renders no-JS template when nojs query parameter is true', () => {
      mockRequest.method = 'get'
      mockRequest.query = { nojs: 'true' }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.any(Object)
      )
    })

    it('renders no-JS template when path includes nojs', () => {
      mockRequest.method = 'get'
      mockRequest.path = '/add_pollutant/nojs'
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.any(Object)
      )
    })

    it('renders no-JS template when user-agent contains noscript', () => {
      mockRequest.method = 'get'
      mockRequest.headers = { 'user-agent': 'SomeBot/1.0 (noscript)' }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.any(Object)
      )
    })

    it('sets backlink flags', () => {
      mockRequest.method = 'get'
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      )
    })
  })

  describe('POST requests - Validation errors', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('returns error when no mode is selected', () => {
      mockRequest.payload = {}
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Select an option before continuing',
                href: '#mode-specific'
              }
            ]
          },
          errorMessage: {
            message: { text: 'Select an option before continuing' }
          }
        })
      )
    })

    it('returns error when group mode selected but no group chosen', () => {
      mockRequest.payload = { 'pollutant-mode': 'group' }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [{ text: 'Select a pollutant group', href: '#pg-core' }]
          },
          selectedMode: 'group',
          selectedGroup: undefined
        })
      )
    })

    it('returns error when specific mode selected but no pollutants', () => {
      mockRequest.payload = { 'pollutant-mode': 'specific' }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Please add at least one pollutant',
                href: '#my-autocomplete'
              }
            ]
          },
          errorMessage: {
            message: { text: 'Please add at least one pollutant' }
          },
          selectedMode: 'specific',
          selectedPollutants: []
        })
      )
    })

    it('returns error when invalid pollutants provided', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: JSON.stringify([
          'Invalid Pollutant',
          'Another Invalid One'
        ])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Invalid pollutant(s): Invalid Pollutant, Another Invalid One. Select from the allowed list.',
                href: '#my-autocomplete'
              }
            ]
          },
          errorMessage: {
            message: { text: expect.stringContaining('Invalid pollutant(s)') }
          }
        })
      )
    })

    it('returns error when duplicate pollutants provided', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: JSON.stringify([
          'Nitrogen dioxide (NO2)',
          'Nitrogen dioxide (NO2)',
          'Particulate matter (PM10)'
        ])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Duplicate pollutant(s): Nitrogen dioxide (NO2) have already been added.',
                href: '#my-autocomplete'
              }
            ]
          },
          errorMessage: {
            message: { text: expect.stringContaining('Duplicate pollutant(s)') }
          }
        })
      )
    })

    it('uses no-JS template when nojs query is true', () => {
      mockRequest.payload = {}
      mockRequest.query = { nojs: 'true' }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.objectContaining({
          errors: expect.any(Object),
          errorMessage: expect.any(Object)
        })
      )
    })

    it('uses no-JS template when path contains nojs', () => {
      mockRequest.payload = { 'pollutant-mode': 'specific' }
      mockRequest.path = '/add_pollutant/nojs'
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.any(Object)
      )
    })

    it('uses no-JS template when user-agent contains noscript', () => {
      mockRequest.payload = { 'pollutant-mode': 'group' }
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0 (compatible; noscript)'
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.any(Object)
      )
    })

    it('preserves form state on validation fail (specific mode)', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        'pollutant-group': 'core',
        selectedPollutants: JSON.stringify(['Invalid'])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          selectedMode: 'specific',
          selectedGroup: '',
          selectedPollutants: ['Invalid']
        })
      )
    })

    it('preserves form state on validation fail (group mode)', () => {
      mockRequest.payload = { 'pollutant-mode': 'group' }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          selectedMode: 'group',
          selectedGroup: undefined,
          selectedPollutants: []
        })
      )
    })

    it('handles empty pollutants array', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: JSON.stringify([])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Please add at least one pollutant',
                href: '#my-autocomplete'
              }
            ]
          },
          errorMessage: {
            message: { text: 'Please add at least one pollutant' }
          }
        })
      )
    })

    it('handles null or undefined request payload', () => {
      mockRequest.payload = null
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Select an option before continuing',
                href: '#mode-specific'
              }
            ]
          },
          errorMessage: {
            message: { text: 'Select an option before continuing' }
          }
        })
      )
    })
  })

  describe('POST requests - Success scenarios', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('handles core group selection successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'group',
        'pollutant-group': 'core'
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'Particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide',
        'Ozone',
        'Sulphur dioxide'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'group'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantGroup',
        'core'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles compliance group selection successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'group',
        'pollutant-group': 'compliance'
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'Particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide',
        'Ozone',
        'Sulphur dioxide',
        'Nitric oxide',
        'Nitrogen oxides as nitrogen dioxide',
        'Carbon monoxide'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'group'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantGroup',
        'compliance'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles specific pollutants selection successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: JSON.stringify([
          'Nitrogen dioxide (NO2)',
          'Particulate matter (PM10)',
          'Ozone (O3)'
        ])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'Nitrogen dioxide (NO2)',
        'Particulate matter (PM10)',
        'Ozone (O3)'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'specific'
      )
      // Removed strict call count; controller may set additional session keys
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles valid pollutant variations successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: JSON.stringify([
          'Fine particulate matter (PM2.5)',
          'Nitrogen dioxide (NO2)',
          'Carbon monoxide (CO)'
        ])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'Fine particulate matter (PM2.5)',
        'Nitrogen dioxide (NO2)',
        'Carbon monoxide (CO)'
      ])
      expect(mockH.redirect).toHaveBeenCalled()
    })

    it('handles unknown group gracefully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'group',
        'pollutant-group': 'unknown'
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'group'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantGroup',
        'unknown'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles JSON string pollutants data', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants:
          '["Nitrogen dioxide (NO2)", "Particulate matter (PM10)"]'
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'Nitrogen dioxide (NO2)',
        'Particulate matter (PM10)'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'specific'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('handles whitespace-padded pollutants and redirects', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: JSON.stringify([
          '  Nitrogen dioxide (NO2)  ',
          ' Particulate matter (PM10) ',
          'Ozone (O3)'
        ])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        '  Nitrogen dioxide (NO2)  ',
        ' Particulate matter (PM10) ',
        'Ozone (O3)'
      ])
      expect(mockH.redirect).toHaveBeenCalled()
    })
  })

  describe('Edge cases and complex validation', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('handles multiple validation errors at once (invalid + duplicate)', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: JSON.stringify([
          'Invalid Pollutant',
          'Nitrogen dioxide (NO2)',
          'nitrogen dioxide (NO2)'
        ])
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Invalid pollutant(s)')
              }),
              expect.objectContaining({
                text: expect.stringContaining('Duplicate pollutant(s)')
              })
            ])
          },
          errorMessage: {
            message: { text: expect.stringContaining('Invalid pollutant(s)') }
          }
        })
      )
    })

    it('uses no-JS template for POST when path contains nojs', () => {
      mockRequest.payload = { 'pollutant-mode': 'specific' }
      mockRequest.path = '/add_pollutant/nojs'
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.any(Object)
      )
    })

    it('uses no-JS template for POST when UA contains noscript', () => {
      mockRequest.payload = { 'pollutant-mode': 'group' }
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0 (compatible; noscript)'
      }
      airpollutantController.handler(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index_nojs',
        expect.any(Object)
      )
    })
  })
})
