import { yearController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Mock englishNew import to match controller usage
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

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      method: 'get',
      yar: {
        set: jest.fn(),
        get: jest.fn()
      },
      payload: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('year-aurn-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  describe('GET requests', () => {
    it('should set all session values and render the view with correct data', () => {
      mockRequest.method = 'get'
      const result = yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')

      expect(mockH.view).toHaveBeenCalledWith('year_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('year-aurn-view-response')
    })

    it('should set displayBacklink to true and hrefq to correct back URL', () => {
      mockRequest.method = 'get'
      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      )
    })
  })

  describe('POST requests - Validation', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('should return error when no time option is selected', () => {
      mockRequest.payload = {}

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              { text: 'Select an option before continuing', href: '#time-ytd' }
            ],
            details: { time: 'Select an option before continuing' }
          },
          formData: {}
        })
      )
    })

    it('should return error when any year is selected but no year is entered', () => {
      mockRequest.payload = { time: 'any', 'any-year-input': '' }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: {
            list: [{ text: 'Enter a year.', href: '#any-year-input' }],
            details: { 'any-year': 'Enter a year.' }
          }
        })
      )
    })

    it('should return error when any year is not 4 digits', () => {
      mockRequest.payload = { time: 'any', 'any-year-input': '20' }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Enter a 4-digit year, for example 2009.',
                href: '#any-year-input'
              }
            ],
            details: { 'any-year': 'Enter a 4-digit year, for example 2009.' }
          }
        })
      )
    })

    it('should return error when any year is outside valid range', () => {
      mockRequest.payload = { time: 'any', 'any-year-input': '1900' }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Year must be between 1973 and 2025.',
                href: '#any-year-input'
              }
            ],
            details: { 'any-year': 'Year must be between 1973 and 2025.' }
          }
        })
      )
    })

    it('should return error when range is selected but no start year', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '',
        'range-end-year': '2020'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              { text: 'Enter a start year.', href: '#range-start-year' }
            ]),
            details: expect.objectContaining({
              'range-start': 'Enter a start year.'
            })
          })
        })
      )
    })

    it('should return error when range is selected but no end year', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2020',
        'range-end-year': ''
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              { text: 'Enter an end year.', href: '#range-end-year' }
            ]),
            details: expect.objectContaining({
              'range-end': 'Enter an end year.'
            })
          })
        })
      )
    })

    it('should return error when start year is not 4 digits', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '20',
        'range-end-year': '2020'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              {
                text: 'Start year must be 4 digits, for example 2009.',
                href: '#range-start-year'
              }
            ]),
            details: expect.objectContaining({
              'range-start': 'Start year must be 4 digits, for example 2009.'
            })
          })
        })
      )
    })

    it('should return error when end year is not 4 digits', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2020',
        'range-end-year': '20'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              {
                text: 'End year must be 4 digits, for example 2010.',
                href: '#range-end-year'
              }
            ]),
            details: expect.objectContaining({
              'range-end': 'End year must be 4 digits, for example 2010.'
            })
          })
        })
      )
    })

    it('should return error when start year is outside valid range', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '1972',
        'range-end-year': '1975'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              {
                text: 'Start year must be between 1973 and 2025.',
                href: '#range-start-year'
              }
            ]),
            details: expect.objectContaining({
              'range-start': 'Start year must be between 1973 and 2025.'
            })
          })
        })
      )
    })

    it('should return error when end year is outside valid range', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2020',
        'range-end-year': '2030'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              {
                text: 'End year must be between 1973 and 2025.',
                href: '#range-end-year'
              }
            ]),
            details: expect.objectContaining({
              'range-end': 'End year must be between 1973 and 2025.'
            })
          })
        })
      )
    })

    it('should return error when start year is after end year', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2020',
        'range-end-year': '2018'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              {
                text: 'Start year must be the same as or before the end year.',
                href: '#range-start-year'
              },
              {
                text: 'End year must be the same as or after the start year.',
                href: '#range-end-year'
              }
            ]),
            details: expect.objectContaining({
              'range-start':
                'Start year must be the same as or before the end year.',
              'range-end':
                'End year must be the same as or after the start year.'
            })
          })
        })
      )
    })

    it('should return error when year range exceeds 5 years', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2015',
        'range-end-year': '2021'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'year_aurn/index',
        expect.objectContaining({
          errors: expect.objectContaining({
            list: expect.arrayContaining([
              {
                text: 'Choose up to 5 whole years at a time',
                href: '#range-start-year'
              }
            ]),
            details: expect.objectContaining({
              'range-start': 'Choose up to 5 whole years at a time'
            })
          })
        })
      )
    })
  })

  describe('POST requests - Success scenarios', () => {
    beforeEach(() => {
      mockRequest.method = 'post'

      // Mock the Date constructor to return our fixed date
      const fixedDate = new Date('2025-12-18T12:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate)

      // Mock Intl.DateTimeFormat constructor and format method
      const mockFormat = jest.fn().mockReturnValue('18 December 2025')
      jest.spyOn(global.Intl, 'DateTimeFormat').mockImplementation(() => ({
        format: mockFormat
      }))
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should handle year to date selection successfully', () => {
      mockRequest.payload = { time: 'ytd' }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January to 18 December 2025'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle any year selection for current year successfully', () => {
      mockRequest.payload = { time: 'any', 'any-year-input': '2025' }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January to 18 December 2025'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle any year selection for past year successfully', () => {
      mockRequest.payload = { time: 'any', 'any-year-input': '2020' }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January to 31 December 2020'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle range selection ending with current year successfully', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2023',
        'range-end-year': '2025'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2023 to 18 December 2025'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle range selection for past years successfully', () => {
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
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle valid 5-year range successfully', () => {
      mockRequest.payload = {
        time: 'range',
        'range-start-year': '2016',
        'range-end-year': '2020'
      }

      yearController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedTimePeriod',
        '1 January 2016 to 31 December 2020'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })
  })

  describe('Default fallback', () => {
    it('should return default view when method is neither GET nor POST', () => {
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
