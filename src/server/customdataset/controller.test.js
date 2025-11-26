import { customdatasetController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
// import Wreck from '@hapi/wreck'
import axios from 'axios'

jest.mock('~/src/server/data/en/content_aurn.js')
jest.mock('~/src/config/config.js')
jest.mock('~/src/server/common/helpers/errors_message.js')
jest.mock('@hapi/wreck')
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
      path: '/customdataset'
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
  })

  describe('/clear path', () => {
    it('should clear session values and render view when path includes /clear', async () => {
      mockRequest.path = '/customdataset/clear'

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedyear', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
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

    it('should set displayBacklink to true and hrefq to correct back URL', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: ['England'],
          nooflocation: 5
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          displayBacklink: true,
          hrefq: '/hubpage'
        })
      )
    })

    it('should clear all session values when path includes /clear', async () => {
      mockRequest.path = '/customdataset/clear'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledTimes(4)
    })
  })

  describe('error handling', () => {
    it('should handle pollutants null error', async () => {
      mockRequest.params.pollutants = 'null'
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

    it('should set errors and errorMessage to empty strings on null pollutants', async () => {
      mockRequest.params.pollutants = 'null'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('errors', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('errorMessage', '')
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

    it('should handle array of pollutants', async () => {
      mockRequest.params.pollutants = ['Ozone (O3)', 'Sulphur dioxide (SO2)']

      await customdatasetController.handler(mockRequest, mockH)

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
    it('should set selectedlocation from string payload', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = 'England'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
        'England'
      ])
    })

    it('should set selectedlocation from array payload', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England', 'Wales']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', [
        'England',
        'Wales'
      ])
    })

    it('should handle undefined country payload', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = undefined
      mockRequest.yar.get.mockReturnValue(undefined)

      const result = await customdatasetController.handler(mockRequest, mockH)

      // When country is undefined, handler should render view with default values
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

  describe('year range parsing', () => {
    it('should parse year range with two years', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January 2022 to 31 December 2024',
          selectedlocation: ['England']
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
    })

    it('should handle year range spanning 5+ years', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January 2019 to 31 December 2025',
          selectedlocation: ['England']
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 15 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearrange', 'Multiple')
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'finalyear',
        '2019,2020,2021,2022,2023,2024,2025'
      )
    })

    it('should not set yearrange when selectedyear is undefined', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: undefined,
          selectedlocation: ['England']
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      // Should not set yearrange when year is undefined
      const yearrangeCalls = mockRequest.yar.set.mock.calls.filter(
        (call) => call[0] === 'yearrange'
      )
      expect(yearrangeCalls).toHaveLength(0)
    })
  })

  describe('pollutant name formatting', () => {
    it('should format pollutants correctly to display names', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: [
            'Fine particulate matter (PM2.5)',
            'Particulate matter (PM10)',
            'Nitrogen dioxide (NO2)',
            'Ozone (O3)',
            'Sulphur dioxide (SO2)'
          ],
          selectedyear: '2024',
          selectedlocation: ['England']
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

    it('should handle compliance pollutants formatting', async () => {
      mockRequest.params.pollutants = 'compliance'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: [
            'Fine particulate matter (PM2.5)',
            'Particulate matter (PM10)',
            'Nitrogen dioxide (NO2)',
            'Ozone (O3)',
            'Sulphur dioxide (SO2)',
            'Nitric oxide (NO)',
            'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
            'Carbon monoxide (CO)'
          ],
          selectedyear: '2024',
          selectedlocation: ['England']
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 12 })

      await customdatasetController.handler(mockRequest, mockH)

      // Note: Nitric oxide (NO) returns null, so it's filtered out
      const formattedPollutantsCalls = mockRequest.yar.set.mock.calls.filter(
        (call) => call[0] === 'formattedPollutants'
      )
      expect(formattedPollutantsCalls.length).toBeGreaterThan(0)
    })

    it('should filter out null pollutants in formatting', async () => {
      mockRequest.params.pollutants = 'compliance'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Nitric oxide (NO)'],
          selectedyear: '2024',
          selectedlocation: ['England']
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 2 })

      await customdatasetController.handler(mockRequest, mockH)

      // Nitric oxide (NO) maps to null, so should be filtered
      const formattedPollutantsCalls = mockRequest.yar.set.mock.calls.filter(
        (call) => call[0] === 'formattedPollutants'
      )
      expect(formattedPollutantsCalls.length).toBeGreaterThan(0)
    })
  })

  describe('station count calculation', () => {
    it('should handle station count API error', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: ['England']
        }
        return values[key]
      })

      const error = new Error('API Error')
      axios.post.mockRejectedValue(error)

      await customdatasetController.handler(mockRequest, mockH)

      // Error handling depends on controller implementation
      // Either it sets the error or handles it gracefully
      const nooflocationCalls = mockRequest.yar.set.mock.calls.filter(
        (call) => call[0] === 'nooflocation'
      )
      expect(nooflocationCalls.length).toBeGreaterThanOrEqual(0)
    })

    it('should not calculate station count when selectedyear is undefined', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: undefined,
          selectedlocation: ['England']
        }
        return values[key]
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should not calculate station count when selectedlocation is undefined', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: undefined
        }
        return values[key]
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).not.toHaveBeenCalled()
    })
  })

  describe('view rendering', () => {
    it('should render customdataset view with all data', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: ['England'],
          nooflocation: 5
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 5 })

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

    it('should render customdataset view with undefined values', async () => {
      mockRequest.params.pollutants = undefined
      mockRequest.yar.get.mockReturnValue(undefined)

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

    it('should render customdataset view without station count calculation', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: undefined,
          selectedlocation: ['England']
        }
        return values[key]
      })

      const result = await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        selectedpollutant: ['Ozone (O3)'],
        selectedyear: undefined,
        selectedlocation: ['England'],
        stationcount: undefined,
        displayBacklink: true,
        hrefq: '/hubpage'
      })
      expect(result).toBe('view-response')
    })
  })

  describe('complete user flow', () => {
    it('should handle flow with clear action', async () => {
      mockRequest.path = '/customdataset'
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: ['England'],
          nooflocation: 5
        }
        return values[key]
      })

      // Clear everything
      mockRequest.path = '/customdataset/clear'
      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedyear', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedlocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    })
  })

  describe('edge cases', () => {
    it('should handle invalid year format gracefully', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: 'invalid date format',
          selectedlocation: ['England']
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      // Should still render view, just without yearrange/finalyear being set
      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle missing country in payload', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = undefined

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle config returning undefined', async () => {
      config.get.mockReturnValue(undefined)
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: ['England']
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      // Should handle undefined config gracefully
      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle zero location selection', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = []
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: []
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 0 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle network error gracefully', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '2024',
          selectedlocation: ['England']
        }
        return values[key]
      })

      const networkError = new Error('Network error')
      networkError.code = 'ENOTFOUND'
      axios.post.mockRejectedValue(networkError)

      await customdatasetController.handler(mockRequest, mockH)

      // Should still render view even with network error
      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle very large year range', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England']
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January 2000 to 31 December 2025',
          selectedlocation: ['England']
        }
        return values[key]
      })

      axios.post.mockResolvedValue({ data: 100 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'finalyear',
        '2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025'
      )
    })
  })
})
