import { yearController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Year Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

// Constants matching the controller for consistency
const FIELD_ANY_YEAR_INPUT = 'any-year-input'
const FIELD_RANGE_START_YEAR = 'range-start-year'
const FIELD_RANGE_END_YEAR = 'range-end-year'

describe('yearController', () => {
  let mockRequest
  let mockH
  let originalDate
  let originalIntl

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Date and Intl to make "current year" deterministic (2026)
    originalDate = global.Date
    originalIntl = global.Intl

    const fixed = new Date('2026-01-16T12:00:00.000Z')
    const MockDate = function (...args) {
      return args.length ? Reflect.construct(originalDate, args) : fixed
    }
    MockDate.UTC = originalDate.UTC
    MockDate.parse = originalDate.parse
    MockDate.now = () => fixed.getTime()
    MockDate.prototype = originalDate.prototype
    global.Date = MockDate

    global.Intl = {
      DateTimeFormat: jest.fn().mockImplementation(() => ({
        format: jest.fn().mockReturnValue('16 January 2026')
      }))
    }

    mockRequest = {
      method: 'get',
      yar: {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(undefined),
        clear: jest.fn()
      },
      payload: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('year-aurn-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  afterEach(() => {
    global.Date = originalDate
    global.Intl = originalIntl
    jest.restoreAllMocks()
  })

  describe('GET', () => {
    it('renders base view with empty formData when no session values', () => {
      const result = yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          errors: { list: [], details: {} },
          formData: {
            time: '',
            [FIELD_ANY_YEAR_INPUT]: '',
            [FIELD_RANGE_START_YEAR]: '',
            [FIELD_RANGE_END_YEAR]: ''
          }
        })
      )
      expect(mockRequest.yar.clear).toHaveBeenCalledWith('yearFormErrors')
      expect(mockRequest.yar.clear).toHaveBeenCalledWith('yearFormData')
      expect(result).toBe('year-aurn-view-response')
    })

    it('prefills from saved session keys (TimeSelectionMode, yearany, startYear, endYear, startyear_ytd)', () => {
      mockRequest.yar.get.mockImplementation((k) => {
        const map = {
          TimeSelectionMode: 'range',
          yearany: '',
          startYear: '2019',
          endYear: '2021',
          startyear_ytd: ''
        }
        return map[k]
      })

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          formData: {
            time: 'range',
            [FIELD_ANY_YEAR_INPUT]: '',
            [FIELD_RANGE_START_YEAR]: '2019',
            [FIELD_RANGE_END_YEAR]: '2021'
          }
        })
      )
    })

    it('prefills YTD start when only startyear_ytd is saved', () => {
      mockRequest.yar.get.mockImplementation((k) => {
        const map = {
          TimeSelectionMode: 'ytd',
          startyear_ytd: '2024'
        }
        return map[k]
      })

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          formData: {
            time: 'ytd',
            [FIELD_ANY_YEAR_INPUT]: '',
            [FIELD_RANGE_START_YEAR]: '2024',
            [FIELD_RANGE_END_YEAR]: ''
          }
        })
      )
    })
  })

  describe('POST success', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('YTD sets period with today and redirects (no start year in period)', () => {
      mockRequest.payload = { time: 'ytd' } // no start-year required

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January to 16 January 2026'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Any year (current year) sets period with today and redirects', () => {
      mockRequest.payload = { time: 'any', [FIELD_ANY_YEAR_INPUT]: '2026' }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January to 16 January 2026'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Any year (past year) sets full-year period and redirects', () => {
      mockRequest.payload = { time: 'any', [FIELD_ANY_YEAR_INPUT]: '2020' }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January to 31 December 2020' // controller omits the year after "1 January"
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Range ending in current year uses today for end and redirects', () => {
      mockRequest.payload = {
        time: 'range',
        [FIELD_RANGE_START_YEAR]: '2023',
        [FIELD_RANGE_END_YEAR]: '2026'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2023 to 16 January 2026'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Range for past years sets full-year period and redirects', () => {
      mockRequest.payload = {
        time: 'range',
        [FIELD_RANGE_START_YEAR]: '2018',
        [FIELD_RANGE_END_YEAR]: '2020'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2018 to 31 December 2020'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })
  })

  describe('Fallback', () => {
    it('redirects to year-aurn for non-GET/POST', () => {
      mockRequest.method = 'put'

      const result = yearController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/year-aurn')
      expect(result).toBe('redirect-response')
    })
  })
})
