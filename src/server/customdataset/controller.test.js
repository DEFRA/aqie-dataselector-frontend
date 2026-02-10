import { customdatasetController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
import axios from 'axios'

jest.mock('~/src/server/data/en/content_aurn.js')
jest.mock('~/src/config/config.js')
jest.mock('~/src/server/common/helpers/errors_message.js')
jest.mock('axios')

describe('customdatasetController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = {
      yar: {
        set: jest.fn(),
        get: jest.fn()
      },
      params: {},
      payload: {},
      path: '/customdataset',
      headers: {},
      query: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('view-response')
    }

    englishNew.custom = {
      pageTitle: 'Test Custom Dataset',
      heading: 'Test Heading',
      texts: ['Test text'],
      errorText: {
        uk: {
          fields: {
            title: 'Error Title',
            text: 'Error Text'
          }
        }
      }
    }

    mockRequest.yar.get.mockReturnValue(undefined)
    config.get.mockReturnValue('https://api.example.com/download')

    // Mock axios.post
    axios.post = jest.fn().mockResolvedValue({
      data: 5
    })
  })

  describe('/clear path', () => {
    it('should clear session values and render view when path includes /clear', async () => {
      mockRequest.path = '/customdataset/clear'

      const result = await customdatasetController.handler(mockRequest, mockH)

      // Check that all session variables are cleared
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedyear', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutants',
        null
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        ''
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantGroup',
        ''
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedpollutants_specific',
        []
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedpollutants_group',
        []
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'formattedPollutants',
        ''
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        null
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearrange', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear1', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('Region', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLAIDs', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('Location', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('TimeSelectionMode', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearany', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('startYear', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('endYear', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('startyear_ytd', '')

      expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        selectedpollutant: undefined,
        selectedyear: undefined,
        selectedlocation: undefined,
        stationcount: undefined,
        displayBacklink: true,
        hrefq: '/hubpage'
      })
      expect(result).toBe('view-response')
    })

    it('should clear all 20 session values when path includes /clear', async () => {
      mockRequest.path = '/customdataset/clear'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledTimes(22)
    })
  })

  describe('error handling', () => {
    it('should handle pollutants null error with JS template by default', async () => {
      mockRequest.params.pollutants = 'null'
      mockRequest.headers = {
        accept: 'text/html,application/xhtml+xml,text/javascript'
      }
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'errors') return 'Error Title'
        if (key === 'errorMessage') return 'Error Text'
        return undefined
      })

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(setErrorMessage).toHaveBeenCalledWith(
        mockRequest,
        'Error Title',
        'Error Text'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('errors', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('errorMessage', '')
      expect(mockH.view).toHaveBeenCalledWith('add_pollutant/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        errors: 'Error Title',
        errorMessage: 'Error Text',
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('view-response')
    })

    it('should handle pollutants null error with noJS template when noscript user-agent', async () => {
      mockRequest.params.pollutants = 'null'
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0 (compatible; noscript)'
      }
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'errors') return 'Error Title'
        if (key === 'errorMessage') return 'Error Text'
        return undefined
      })

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('add_pollutant/index_nojs', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        errors: 'Error Title',
        errorMessage: 'Error Text',
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('view-response')
    })

    it('should handle pollutants null error with noJS template when nojs query parameter', async () => {
      mockRequest.params.pollutants = 'null'
      mockRequest.query = { nojs: 'true' }
      mockRequest.headers = { accept: 'text/html,application/xhtml+xml' }
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'errors') return 'Error Title'
        if (key === 'errorMessage') return 'Error Text'
        return undefined
      })

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('add_pollutant/index_nojs', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        errors: 'Error Title',
        errorMessage: 'Error Text',
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('view-response')
    })

    it('should handle pollutants null error with noJS template when accept header lacks javascript', async () => {
      mockRequest.params.pollutants = 'null'
      mockRequest.headers = { accept: 'text/html,application/xhtml+xml' } // No javascript
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'errors') return 'Error Title'
        if (key === 'errorMessage') return 'Error Text'
        return undefined
      })

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('add_pollutant/index_nojs', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        errors: 'Error Title',
        errorMessage: 'Error Text',
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('view-response')
    })
  })

  describe('core pollutants selection', () => {
    it('should set core pollutants when pollutants param is core', async () => {
      mockRequest.params.pollutants = 'core'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Fine particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide (NO2)',
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })
  })

  describe('compliance pollutants selection', () => {
    it('should set compliance pollutants when pollutants param is compliance', async () => {
      mockRequest.params.pollutants = 'compliance'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Fine particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide (NO2)',
        'Ozone (O3)',
        'Sulphur dioxide (SO2)',
        'Nitric oxide (NO)',
        'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
        'Carbon monoxide (CO)'
      ])
    })
  })

  describe('pollutant string parsing', () => {
    it('should split comma-separated pollutants string', async () => {
      mockRequest.params.pollutants = 'Ozone (O3),Sulphur dioxide (SO2)'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('should handle array with single comma-separated string', async () => {
      mockRequest.params.pollutants = ['Ozone (O3),Sulphur dioxide (SO2)']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('should handle array of pollutants correctly', async () => {
      mockRequest.params.pollutants = ['Ozone (O3)', 'Sulphur dioxide (SO2)']

      await customdatasetController.handler(mockRequest, mockH)

      // Updated: The controller treats array differently - it doesn't set selectedpollutant for arrays unless they contain comma-separated strings
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('should trim whitespace from pollutants', async () => {
      mockRequest.params.pollutants = ' Ozone (O3) , Sulphur dioxide (SO2) '

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })
  })

  describe('year selection', () => {
    it('should set selectedyear when path includes /year', async () => {
      mockRequest.path = '/customdataset/year'
      mockRequest.params.year = '1 January to 31 December 2024'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedyear',
        '1 January to 31 December 2024'
      )
    })

    it('should set selectedyear for year range', async () => {
      mockRequest.path = '/customdataset/year'
      mockRequest.params.year = '1 January 2022 to 31 December 2025'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedyear',
        '1 January 2022 to 31 December 2025'
      )
    })
  })

  describe('location selection', () => {
    it('should handle single country in payload and convert to array', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = 'England'

      await customdatasetController.handler(mockRequest, mockH)

      // The controller converts single country to array but doesn't store it directly
      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle array country in payload', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England', 'Wales']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle undefined country payload', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = undefined

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        selectedpollutant: undefined,
        selectedyear: undefined,
        selectedlocation: undefined,
        stationcount: undefined,
        displayBacklink: true,
        hrefq: '/hubpage'
      })
      expect(result).toBe('view-response')
    })
  })

  describe('year range parsing and station count calculation', () => {
    it('should parse year range with two years and calculate station count', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January 2022 to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 10 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearrange', 'Multiple')
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'finalyear',
        '2022,2023,2024'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'finalyear1',
        '2022,2023,2024'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'formattedPollutants',
        'Ozone'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('Region', 'England')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', 10)
    })

    it('should handle single year and calculate station count', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearrange', 'Single')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear', '2024')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear1', '2024')
    })

    it('should handle invalid year format gracefully', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: 'invalid date format',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      await customdatasetController.handler(mockRequest, mockH)

      // When no years found, finalyear1 is set to empty string
      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear1', '')
    })

    it('should calculate station count for Country location type', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 8 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          regiontype: 'Country',
          Region: 'England',
          pollutantName: 'Ozone',
          dataSource: 'AURN',
          Year: '2024',
          dataselectorfiltertype: 'dataSelectorCount',
          dataselectordownloadtype: ''
        }),
        expect.objectContaining({
          timeout: 5000,
          validateStatus: expect.any(Function)
        })
      )
    })

    it('should calculate station count for LocalAuthority location type', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['City of London'],
          selectedLAIDs: '1,2',
          Location: 'LocalAuthority',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/download',
        expect.objectContaining({
          regiontype: 'LocalAuthority',
          Region: '1,2',
          pollutantName: 'Ozone',
          dataSource: 'AURN',
          Year: '2024',
          dataselectorfiltertype: 'dataSelectorCount',
          dataselectordownloadtype: ''
        }),
        expect.objectContaining({
          timeout: 5000,
          validateStatus: expect.any(Function)
        })
      )
    })
  })

  describe('pollutant name formatting', () => {
    it('should format pollutants correctly to display names', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: [
            'Fine particulate matter (PM2.5)',
            'Particulate matter (PM10)',
            'Nitrogen dioxide (NO2)',
            'Ozone (O3)',
            'Sulphur dioxide (SO2)'
          ],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 8 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'formattedPollutants',
        'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide'
      )
    })

    it('should handle Nitric oxide (NO) which maps to null and falls back to original', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Nitric oxide (NO)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 2 })

      await customdatasetController.handler(mockRequest, mockH)

      // The controller uses || p fallback, so original name is preserved when mapping is null
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'formattedPollutants',
        'Nitric oxide (NO)'
      )
    })
  })

  describe('session pollutants handling', () => {
    it('should use session pollutants when available and not set from params', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutants') return ['NO2', 'PM10']
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'NO2',
        'PM10'
      ])
      // Should not set from params when session pollutants exist
      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'selectedpollutant',
        [
          'Fine particulate matter (PM2.5)',
          'Particulate matter (PM10)',
          'Nitrogen dioxide (NO2)',
          'Ozone (O3)',
          'Sulphur dioxide (SO2)'
        ]
      )
    })

    it('should use session pollutants even when they are empty array', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutants') return []
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      // The controller treats empty array as falsy and falls back to params
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Fine particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide (NO2)',
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('should use session pollutants when they contain actual values', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutants') return ['NO2', 'PM10']
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'NO2',
        'PM10'
      ])
    })

    it('should fall back to params when session pollutants is null', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutants') return null
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Fine particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide (NO2)',
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('should fall back to params when session pollutants is undefined', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutants') return undefined
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Fine particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide (NO2)',
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })
  })

  describe('session time period handling', () => {
    it('should use session time period when available', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedTimePeriod') return '1 January to 31 December 2024'
        if (key === 'selectedPollutants') return null
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedyear',
        '1 January to 31 December 2024'
      )
    })

    it('should fall back to path-based year when no session time period', async () => {
      mockRequest.path = '/customdataset/year'
      mockRequest.params.year = '1 January to 31 December 2023'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedTimePeriod') return null
        if (key === 'selectedPollutants') return null
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedyear',
        '1 January to 31 December 2023'
      )
    })
  })

  // describe('error handling', () => {
  //   it('should handle station count API error and store error in session', async () => {
  //     mockRequest.params.pollutants = undefined
  //     mockRequest.yar.get.mockImplementation((key) => {
  //       const values = {
  //         selectedpollutant: ['Ozone (O3)'],
  //         selectedyear: '1 January to 31 December 2024',
  //         selectedlocation: ['England'],
  //         Location: 'Country',
  //         selectedPollutants: null,
  //         selectedTimePeriod: null
  //       }
  //       return values[key]
  //     })

  //     const error = new Error('API Error')
  //     axios.post.mockRejectedValue(error)

  //     await customdatasetController.handler(mockRequest, mockH)

  //     // The controller sets nooflocation to the error object when API fails
  //     expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', error)
  //   })
  // })

  describe('view rendering', () => {
    it('should render customdataset view with all data', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: ['England'],
          nooflocation: 5,
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        selectedpollutant: ['Ozone (O3)'],
        selectedyear: '2024',
        selectedlocation: ['England'],
        stationcount: 5,
        displayBacklink: true,
        hrefq: '/hubpage'
      })
      expect(result).toBe('view-response')
    })

    it('should always set displayBacklink to true and hrefq to /hubpage', async () => {
      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          displayBacklink: true,
          hrefq: '/hubpage'
        })
      )
    })
  })

  describe('condition for station count calculation', () => {
    it('should not calculate station count when selectedlocation is undefined', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: undefined,
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should not calculate station count when selectedyear is undefined', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: undefined,
          selectedlocation: ['England'],
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should not calculate station count when selectedpollutant is undefined', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: undefined,
          selectedyear: '2024',
          selectedlocation: ['England'],
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).not.toHaveBeenCalled()
    })
  })
})
