import { customdatasetController, invokeStationCount } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'

jest.mock('~/src/server/data/en/content_aurn.js')
jest.mock('~/src/config/config.js', () => ({ config: { get: jest.fn() } }))
jest.mock('~/src/server/common/helpers/errors_message.js')
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))
jest.mock('axios')
jest.mock('@hapi/wreck')

describe('customdatasetController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      yar: { set: jest.fn(), get: jest.fn() },
      params: {},
      payload: {},
      path: '/customdataset',
      headers: {},
      query: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response'),
      code: jest.fn().mockReturnThis()
    }

    englishNew.custom = {
      pageTitle: 'Test Custom Dataset',
      heading: 'Test Heading',
      texts: ['Test text'],
      errorText: {
        uk: {
          fields: { title: 'Error Title', text: 'Error Text' }
        }
      }
    }

    mockRequest.yar.get.mockReturnValue(undefined)

    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      return 'https://api.example.com/station-count'
    })

    axios.post.mockResolvedValue({ data: 5 })
  })

  // ─── /clear path ─────────────────────────────────────────────────────────────

  describe('/clear path', () => {
    it('clears all session values and renders view', async () => {
      mockRequest.path = '/customdataset/clear'

      const result = await customdatasetController.handler(mockRequest, mockH)

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
        datasourceGroups: [],
        displayBacklink: true,
        hrefq: '/hubpage'
      })
      expect(result).toBe('view-response')
    })

    it('calls yar.set exactly 22 times for the clear path', async () => {
      mockRequest.path = '/customdataset/clear'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledTimes(22)
    })
  })

  // ─── error handling ───────────────────────────────────────────────────────────

  describe('error handling (pollutants=null)', () => {
    it('renders JS template when accept header includes text/javascript', async () => {
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

    it('renders noJS template when user-agent contains noscript', async () => {
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

    it('renders noJS template when nojs query parameter is true', async () => {
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

    it('renders noJS template when accept header lacks text/javascript', async () => {
      mockRequest.params.pollutants = 'null'
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
  })

  // ─── pollutant selection ──────────────────────────────────────────────────────

  describe('core pollutants selection', () => {
    it('sets core pollutants when pollutants param is core', async () => {
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
    it('sets compliance pollutants when pollutants param is compliance', async () => {
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
    it('splits comma-separated pollutants string', async () => {
      mockRequest.params.pollutants = 'Ozone (O3),Sulphur dioxide (SO2)'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('handles array with single comma-separated string', async () => {
      mockRequest.params.pollutants = ['Ozone (O3),Sulphur dioxide (SO2)']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('handles array of pollutants correctly', async () => {
      mockRequest.params.pollutants = ['Ozone (O3)', 'Sulphur dioxide (SO2)']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('trims whitespace from pollutants', async () => {
      mockRequest.params.pollutants = ' Ozone (O3) , Sulphur dioxide (SO2) '

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Ozone (O3)',
        'Sulphur dioxide (SO2)'
      ])
    })

    it('handles single item array without comma (no split)', async () => {
      mockRequest.params.pollutants = ['PM10']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'PM10'
      ])
    })

    it('handles single item array with comma (splits)', async () => {
      mockRequest.params.pollutants = ['PM10,NO2,O3']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'PM10',
        'NO2',
        'O3'
      ])
    })
  })

  // ─── year selection ───────────────────────────────────────────────────────────

  describe('year selection', () => {
    it('sets selectedyear when path includes /year', async () => {
      mockRequest.path = '/customdataset/year'
      mockRequest.params.year = '1 January to 31 December 2024'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedyear',
        '1 January to 31 December 2024'
      )
    })

    it('sets selectedyear for year range', async () => {
      mockRequest.path = '/customdataset/year'
      mockRequest.params.year = '1 January 2022 to 31 December 2025'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedyear',
        '1 January 2022 to 31 December 2025'
      )
    })
  })

  // ─── location selection ───────────────────────────────────────────────────────

  describe('location selection', () => {
    it('handles location path and renders view', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = 'England'

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalled()
    })

    it('handles array country in payload', async () => {
      mockRequest.path = '/customdataset/location'
      mockRequest.payload.country = ['England', 'Wales']

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalled()
    })

    it('handles undefined country payload and renders default view', async () => {
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
        datasourceGroups: [],
        displayBacklink: true,
        hrefq: '/hubpage'
      })
      expect(result).toBe('view-response')
    })
  })

  // ─── year range parsing + station count ──────────────────────────────────────

  describe('year range parsing and station count calculation', () => {
    it('parses year range with two years and calculates station count', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January 2022 to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutantID: 'ozone-id',
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

    it('parses single year and calculates station count', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutantID: 'ozone-id',
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

    it('handles invalid year format gracefully (no years found)', async () => {
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

      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear1', '')
    })

    it('calls API with correct Country parameters', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutantID: 'ozone-id',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 8 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/station-count',
        expect.objectContaining({
          regiontype: 'Country',
          Region: 'England',
          pollutantName: 'ozone-id',
          dataSource: 'AURN',
          Year: '2024',
          dataselectorfiltertype: 'dataSelectorCount',
          dataselectordownloadtype: ''
        })
      )
    })

    it('calls API with correct LocalAuthority parameters', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['City of London'],
          selectedLAIDs: '1,2',
          Location: 'LocalAuthority',
          selectedPollutantID: 'ozone-id',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/station-count',
        expect.objectContaining({
          regiontype: 'LocalAuthority',
          Region: '1,2',
          pollutantName: 'ozone-id',
          dataSource: 'AURN',
          Year: '2024',
          dataselectorfiltertype: 'dataSelectorCount',
          dataselectordownloadtype: ''
        })
      )
    })

    it('sets stationCountError and nooflocation null when AURN API fails', async () => {
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
      axios.post.mockRejectedValue(new Error('Network error'))

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'stationCountError',
        true
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', null)
      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({ displayBacklink: true, hrefq: '/hubpage' })
      )
    })

    it('handles axios timeout gracefully and still renders the view', async () => {
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
      const err = new Error('timeout of 50000ms exceeded')
      err.code = 'ECONNABORTED'
      axios.post.mockRejectedValue(err)

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'stationCountError',
        true
      )
      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.any(Object)
      )
    })

    it('handles empty axios response data gracefully and still renders', async () => {
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
      axios.post.mockResolvedValue({ data: null })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.any(Object)
      )
    })
  })

  // ─── pollutant name formatting ────────────────────────────────────────────────

  describe('pollutant name formatting', () => {
    it('formats all known pollutants to their display names', async () => {
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

    it('falls back to original name when Nitric oxide (NO) maps to null', async () => {
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

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'formattedPollutants',
        'Nitric oxide (NO)'
      )
    })

    it('formats all compliance pollutants including NOx', async () => {
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
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 15 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'formattedPollutants',
        'PM2.5,PM10,Nitrogen dioxide,Ozone,Sulphur dioxide,Nitric oxide (NO),Nitrogen oxides as nitrogen dioxide,Carbon monoxide'
      )
    })

    it('handles unmapped pollutants by keeping original name', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Unknown Pollutant (XYZ)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 1 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'formattedPollutants',
        'Unknown Pollutant (XYZ)'
      )
    })

    it('handles mixed mapped and unmapped pollutants', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: [
            'Ozone (O3)',
            'Unknown Pollutant',
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
        'Ozone,Unknown Pollutant,Sulphur dioxide'
      )
    })
  })

  // ─── session pollutants handling ──────────────────────────────────────────────

  describe('session pollutants handling', () => {
    it('uses session pollutants when available (ignores params)', async () => {
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

    it('falls back to params when session pollutants is empty array', async () => {
      mockRequest.params.pollutants = 'core'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutants') return []
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

    it('falls back to params when session pollutants is null', async () => {
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

    it('prioritises session pollutants over compliance params', async () => {
      mockRequest.params.pollutants = 'compliance'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutants') return ['Custom Pollutant']
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', [
        'Custom Pollutant'
      ])
      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'selectedpollutant',
        expect.arrayContaining(['Fine particulate matter (PM2.5)'])
      )
    })
  })

  // ─── session time period handling ─────────────────────────────────────────────

  describe('session time period handling', () => {
    it('uses session time period when available', async () => {
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

    it('falls back to path-based year when no session time period', async () => {
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

    it('session time period takes precedence over path year param', async () => {
      mockRequest.path = '/customdataset/year'
      mockRequest.params.year = '2025'
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedTimePeriod') return '2024'
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedyear', '2024')
      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'selectedyear',
        '2025'
      )
    })
  })

  // ─── view rendering ───────────────────────────────────────────────────────────

  describe('view rendering', () => {
    it('renders customdataset view with all session data', async () => {
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
        datasourceGroups: [],
        displayBacklink: true,
        hrefq: '/hubpage'
      })
      expect(result).toBe('view-response')
    })

    it('always sets displayBacklink=true and hrefq=/hubpage', async () => {
      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({ displayBacklink: true, hrefq: '/hubpage' })
      )
    })

    it('passes datasourceGroups from session (defaults to [] when absent)', async () => {
      mockRequest.yar.get.mockReturnValue(undefined)

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({ datasourceGroups: [] })
      )
    })

    it('passes datasourceGroups from session when present', async () => {
      const groups = [{ category: 'AURN', networks: ['AURN'] }]
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'datasourceGroups') return groups
        return undefined
      })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({ datasourceGroups: groups })
      )
    })
  })

  // ─── station count conditions ─────────────────────────────────────────────────

  describe('condition for station count calculation', () => {
    it('does not call API when selectedlocation is undefined', async () => {
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

    it('does not call API when selectedyear is undefined', async () => {
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

    it('does not call API when selectedpollutant is undefined', async () => {
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

  // ─── multiple year ranges ─────────────────────────────────────────────────────

  describe('multiple year ranges', () => {
    it('handles year range spanning more than 2 years', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January 2020 to 31 December 2025',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 20 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearrange', 'Multiple')
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'finalyear',
        '2020,2021,2022,2023,2024,2025'
      )
    })

    it('handles year range with same start and end year', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January 2024 to 31 December 2024',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearrange', 'Multiple')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear', '2024')
    })

    it('handles year in middle of text string', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: 'From 2023 to 2024',
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
      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear', '2023,2024')
    })

    it('handles year range with no matching years', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: 'some text without years',
          selectedlocation: ['England'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 5 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('finalyear1', '')
    })
  })

  // ─── Region session set ───────────────────────────────────────────────────────

  describe('Region session handling', () => {
    it('sets Region from selectedlocation after successful station count', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Ozone (O3)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['England', 'Wales'],
          Location: 'Country',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 12 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'Region',
        'England,Wales'
      )
    })

    it('builds LocalAuthority parameters correctly', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedpollutant: ['Particulate matter (PM10)'],
          selectedyear: '1 January to 31 December 2024',
          selectedlocation: ['City of London', 'Westminster'],
          Location: 'LocalAuthority',
          selectedLAIDs: '1,2,3',
          selectedPollutantID: 'pm10-id',
          selectedPollutants: null,
          selectedTimePeriod: null
        }
        return values[key]
      })
      axios.post.mockResolvedValue({ data: 15 })

      await customdatasetController.handler(mockRequest, mockH)

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com/station-count',
        expect.objectContaining({
          regiontype: 'LocalAuthority',
          Region: '1,2,3',
          pollutantName: 'pm10-id',
          dataSource: 'AURN',
          Year: '2024'
        })
      )
    })
  })
})

// ─── invokeStationCount unit tests ─────────────────────────────────────────────

describe('invokeStationCount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses axios.post in production mode and returns parsed number', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      if (key === 'stationCountApiUrl')
        return 'https://api.example.com/station-count'
      return undefined
    })
    axios.post.mockResolvedValue({ data: '15' })

    const result = await invokeStationCount({ pollutantName: 'NO2' })

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.example.com/station-count',
      { pollutantName: 'NO2' }
    )
    expect(result).toBe(15)
  })

  it('returns Error object when axios throws in production mode', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      return 'https://api.example.com/station-count'
    })
    axios.post.mockRejectedValue(new Error('Network failure'))

    const result = await invokeStationCount({ pollutantName: 'NO2' })

    expect(result).toBeInstanceOf(Error)
    expect(result.message).toContain('Station count API error')
  })

  it('uses Wreck.post in development mode and returns parsed result', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return true
      if (key === 'stationCountDevUrl') return 'https://dev.api/station-count'
      if (key === 'osNamesDevApiKey') return 'dev-api-key'
      return undefined
    })
    Wreck.post.mockResolvedValue({ payload: '8' })

    const result = await invokeStationCount({ pollutantName: 'NO2' })

    expect(Wreck.post).toHaveBeenCalled()
    expect(result).toBe(8)
  })

  it('returns error when Wreck throws in development mode', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return true
      return 'https://dev.api/station-count'
    })
    Wreck.post.mockRejectedValue(new Error('Wreck error'))

    const result = await invokeStationCount({ pollutantName: 'NO2' })

    expect(result).toBeInstanceOf(Error)
  })
})
