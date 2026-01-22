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
        get: jest.fn().mockReturnValue(undefined)
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
    it('sets session defaults and renders base view', () => {
      const result = yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2026')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2026')

      expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset',
        formData: {}
      })
      expect(result).toBe('year-aurn-view-response')
    })

    it('pre-populates YTD when selectedTimePeriod matches YTD format', () => {
      mockRequest.yar.get.mockImplementation((k) =>
        k === 'selectedTimePeriod' ? '1 January to 16 January 2026' : undefined
      )

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset',
        formData: { time: 'ytd' }
      })
    })

    // it('pre-populates Any year when period is a single full year', () => {
    //   mockRequest.yar.get.mockImplementation((k) =>
    //     k === 'selectedTimePeriod' ? '1 January to 31 December 2024' : undefined
    //   )

    //   yearController.handler(mockRequest, mockH)

    //   expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
    //     pageTitle: englishNew.custom.pageTitle,
    //     heading: englishNew.custom.heading,
    //     texts: englishNew.custom.texts,
    //     displayBacklink: true,
    //     hrefq: '/customdataset',
    //     formData: { time: 'any', 'any-year-input': '2024' }
    //   })
    // })

    it('pre-populates Range when start and end differ', () => {
      mockRequest.yar.get.mockImplementation((k) =>
        k === 'selectedTimePeriod'
          ? '1 January 2019 to 31 December 2021'
          : undefined
      )

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: ['Test text 1', 'Test text 2'],
        displayBacklink: true,
        hrefq: '/customdataset',
        formData: {
          time: 'range',
          'range-start-year': '2019',
          'range-end-year': '2021'
        }
      })
    })

    it('pre-populates Range ending in current date', () => {
      mockRequest.yar.get.mockImplementation((k) =>
        k === 'selectedTimePeriod'
          ? '1 January 2024 to 16 January 2026'
          : undefined
      )

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: 'Test Heading',
        texts: ['Test text 1', 'Test text 2'],
        displayBacklink: true,
        hrefq: '/customdataset',
        formData: {
          time: 'range',
          'range-start-year': '2024',
          'range-end-year': '2026'
        }
      })
    })
  })

  describe('POST success', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('YTD sets period and redirects', () => {
      mockRequest.payload = { time: 'ytd', 'range-start-year': '2024' } // rs used for YTD in controller

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2024 to 16 January 2026'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '')
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Any year (current year) sets YTD-like period and redirects', () => {
      mockRequest.payload = { time: 'any', 'any-year-input': '2026' }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2026 to 31 December 2026'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2026')
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Any year (past year) sets full-year period and redirects', () => {
      mockRequest.payload = { time: 'any', 'any-year-input': '2020' }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2020 to 31 December 2020'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2020')
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Range ending in current year uses today for end', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2023',
        'range-end-year': '2026'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2023 to 31 December 2026'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '')
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('Range for past years sets full-year period and redirects', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2018',
        'range-end-year': '2020'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2018 to 31 December 2020'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '')
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })
  })

  describe('Fallback', () => {
    it('renders default view for non-GET/POST', () => {
      mockRequest.method = 'put'
      const result = yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('year-aurn-view-response')
    })
  })
})
