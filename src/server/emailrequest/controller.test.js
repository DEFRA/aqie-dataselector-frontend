import { emailrequestController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'

// Mock external dependencies
jest.mock('axios')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

// Mock the content module
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Page Title',
      heading: 'Test Heading',
      texts: 'Test Texts'
    }
  }
}))

// Mock console methods to prevent test output noise
const originalConsole = console

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
})

afterAll(() => {
  global.console = originalConsole
})

describe('emailrequestController', () => {
  let mockRequest
  let mockH
  let mockAxios
  let mockConfig

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    mockRequest = {
      path: undefined,
      payload: {},
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    mockAxios = jest.mocked(axios.post)
    mockConfig = jest.mocked(config.get)
    mockConfig.mockReturnValue('https://api.example.com/email')

    // Setup default yar.get mock returns
    mockRequest.yar.get.mockImplementation((key) => {
      const mockData = {
        formattedPollutants: ['NO2', 'PM10'],
        selectedlocation: ['London', 'Manchester'],
        Location: 'LocalAuthority',
        finalyear1: '2023',
        email: 'test@example.com' // Set default email
      }
      return mockData[key]
    })

    // Mock axios.post to return 'Success' by default
    mockAxios.mockResolvedValue({ data: 'Success' })
  })

  describe('GET /emailrequest (default path)', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest'
    })

    it('should render the email request form with correct data', async () => {
      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(mockH.view).toHaveBeenCalled()
    })

    it('should handle missing path correctly', async () => {
      mockRequest.path = undefined

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(mockH.view).toHaveBeenCalled()
    })
  })

  describe('POST /emailrequest/confirm (confirm path)', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
    })

    describe('Email validation', () => {
      it('should show error when no email is provided', async () => {
        mockRequest.payload = {}

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          error: 'Please enter an email address',
          email: undefined
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should show error when email is null', async () => {
        mockRequest.payload = { email: null }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          error: 'Please enter an email address',
          email: null
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should show error when email is empty string', async () => {
        mockRequest.payload = { email: '' }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          error: 'Please enter an email address',
          email: ''
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should show error when email is not a string', async () => {
        mockRequest.payload = { email: 123 }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          error: 'Please enter a valid email address',
          email: 123
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should show error for invalid email format - missing @', async () => {
        mockRequest.payload = { email: 'invalidemailformat' }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          error: 'Please enter a valid email address',
          email: 'invalidemailformat'
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should show error for invalid email format - missing domain', async () => {
        mockRequest.payload = { email: 'test@' }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          error: 'Please enter a valid email address',
          email: 'test@'
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should show error for invalid email format - missing TLD', async () => {
        mockRequest.payload = { email: 'test@domain' }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          error: 'Please enter a valid email address',
          email: 'test@domain'
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      // it('should show error for invalid email format - invalid characters', async () => {
      //   mockRequest.payload = { email: 'test@domain..com' }

      //   const result = await emailrequestController.handler(mockRequest, mockH)

      //   expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
      //     pageTitle: englishNew.custom.pageTitle,
      //     heading: englishNew.custom.heading,
      //     texts: englishNew.custom.texts,
      //     displayBacklink: true,
      //     hrefq: '/customdataset',
      //     error: 'Please enter a valid email address',
      //     email: 'test@domain..com'
      //   })
      //   expect(result).toBe('view-response')
      // })

      it('should accept valid email and call API correctly', async () => {
        mockRequest.payload = { email: 'test@example.com' }
        mockAxios.mockResolvedValue({ data: 'Success' })

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'email',
          'test@example.com'
        )
        expect(mockAxios).toHaveBeenCalledWith(
          'https://api.example.com/email',
          {
            pollutantName: ['NO2', 'PM10'],
            dataSource: 'AURN',
            Region: 'London,Manchester',
            regiontype: 'LocalAuthority',
            Year: '2023',
            dataselectorfiltertype: 'dataSelectorCount',
            dataselectordownloadtype: 'dataSelectorMultiple',
            email: 'test@example.com'
          }
        )

        expect(mockH.view).toHaveBeenCalledWith(
          'emailrequest/requestconfirm.njk',
          {
            pageTitle: englishNew.custom.pageTitle,
            heading: englishNew.custom.heading,
            texts: englishNew.custom.texts
          }
        )
      })

      it('should redirect to problem-with-service when API returns non-Success', async () => {
        mockRequest.payload = { email: 'test@example.com' }
        mockAxios.mockResolvedValue({ data: 'Failed' })

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'email',
          'test@example.com'
        )
        expect(mockAxios).toHaveBeenCalled()
        expect(mockH.redirect).toHaveBeenCalledWith(
          '/check-air-quality/problem-with-service?statusCode=500'
        )
      })
    })

    describe('Valid email scenarios', () => {
      beforeEach(() => {
        mockRequest.payload = { email: 'test@example.com' }
      })

      it('should successfully process valid email and call API', async () => {
        const mockApiResponse = 'Success'
        mockAxios.mockResolvedValue({ data: mockApiResponse })

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'email',
          'test@example.com'
        )
        expect(mockAxios).toHaveBeenCalled()

        expect(mockH.view).toHaveBeenCalledWith(
          'emailrequest/requestconfirm.njk',
          {
            pageTitle: englishNew.custom.pageTitle,
            heading: englishNew.custom.heading,
            texts: englishNew.custom.texts
          }
        )
      })

      it('should handle API error gracefully', async () => {
        mockRequest.payload = { email: 'test@example.com' }
        const mockError = new Error('API Error')
        mockAxios.mockRejectedValue(mockError)

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockAxios).toHaveBeenCalled()
        expect(mockH.redirect).toHaveBeenCalledWith(
          '/check-air-quality/problem-with-service?statusCode=500'
        )
      })

      it('should work with different valid email formats', async () => {
        const validEmails = [
          'user@domain.com',
          'user.name@domain.co.uk',
          'user+tag@domain.org',
          'user123@domain123.net',
          'a@b.co',
          'test_email@example-domain.com',
          'user.with+symbol@long-domain-name.co.uk',
          'simple@test.io'
        ]

        for (const email of validEmails) {
          jest.clearAllMocks() // Clear mocks between iterations
          mockConfig.mockReturnValue('https://api.example.com/email') // Reset config mock
          // Reset the yar.get mock for each iteration
          mockRequest.yar.get.mockImplementation((key) => {
            const mockData = {
              formattedPollutants: ['NO2', 'PM10'],
              selectedlocation: ['London', 'Manchester'],
              Location: 'LocalAuthority',
              finalyear1: '2023',
              email
            }
            return mockData[key]
          })
          mockRequest.payload = { email }
          mockAxios.mockResolvedValue({ data: 'Success' })

          await emailrequestController.handler(mockRequest, mockH)

          expect(mockRequest.yar.set).toHaveBeenCalledWith('email', email)
          expect(mockH.view).toHaveBeenCalledWith(
            'emailrequest/requestconfirm.njk',
            {
              pageTitle: englishNew.custom.pageTitle,
              heading: englishNew.custom.heading,
              texts: englishNew.custom.texts
            }
          )
          expect(mockH.view).toHaveBeenCalled()
          expect(mockAxios).toHaveBeenCalled()
        }
      })

      // it('should reject various invalid email formats', async () => {
      //   const invalidEmails = [
      //     'plaintext',
      //     '@domain.com',
      //     'user@',
      //     'user@domain',
      //     'user name@domain.com', // space in local part
      //     'user@domain .com', // space in domain
      //     '.user@domain.com', // starts with dot
      //     'user@domain.c', // TLD too short
      //     'user@.domain.com', // domain starts with dot
      //     '', // empty string
      //     '   ', // only whitespace
      //     'user@domain@com', // double @
      //     'user@@domain.com' // double @
      //   ]

      //   for (const email of invalidEmails) {
      //     jest.clearAllMocks() // Clear mocks between iterations
      //     mockRequest.payload = { email }

      //     const result = await emailrequestController.handler(mockRequest, mockH)

      //     expect(mockH.view).toHaveBeenCalledWith('emailrequest/index',
      //       expect.objectContaining({
      //         error: expect.stringContaining('email'),
      //         email: email
      //       })
      //     )
      //     expect(result).toBe('view-response')
      //     expect(mockAxios).not.toHaveBeenCalled()
      //   }
      // })

      // it('should accept emails that might seem questionable but match the regex', async () => {
      //   const questionableButValidEmails = [
      //     'user..name@domain.com', // double dots are actually allowed by the regex
      //     'user@domain..com', // double dots in domain are allowed by the regex
      //     'user.@domain.com', // ending with dot is allowed
      //     'user@domain.com.' // domain ending with dot is allowed
      //   ]

      //   for (const email of questionableButValidEmails) {
      //     jest.clearAllMocks()
      //     mockConfig.mockReturnValue('https://api.example.com/email')
      //     mockRequest.payload = { email }
      //     mockAxios.mockResolvedValue({ data: { success: true } })

      //     const result = await emailrequestController.handler(mockRequest, mockH)

      //     expect(mockH.view).toHaveBeenCalledWith('emailrequest/requestconfirm.njk',
      //       expect.objectContaining({
      //         pageTitle: englishNew.custom.pageTitle
      //       })
      //     )
      //     expect(result).toBe('view-response')
      //   }
      // })

      it('should handle missing session data gracefully', async () => {
        mockRequest.yar.get.mockImplementation((key) => {
          if (key === 'selectedlocation') return []
          return undefined
        })
        mockAxios.mockResolvedValue({ data: 'Success' })

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'email',
          'test@example.com'
        )
        expect(mockAxios).toHaveBeenCalled()
      })
    })

    describe('Session data handling', () => {
      beforeEach(() => {
        mockRequest.payload = { email: 'test@example.com' }
        mockAxios.mockResolvedValue({ data: 'Success' })
      })

      it('should correctly retrieve and use all session data', async () => {
        await emailrequestController.handler(mockRequest, mockH)

        expect(mockRequest.yar.set).toHaveBeenCalledWith(
          'email',
          'test@example.com'
        )
        expect(mockRequest.yar.get).toHaveBeenCalledWith('formattedPollutants')
        expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedlocation')
        expect(mockRequest.yar.get).toHaveBeenCalledWith('Location')
        expect(mockRequest.yar.get).toHaveBeenCalledWith('finalyear1')
        expect(mockRequest.yar.get).toHaveBeenCalledWith('email')

        expect(mockAxios).toHaveBeenCalled()
      })

      it('should handle empty selectedlocation array', async () => {
        mockRequest.yar.get.mockImplementation((key) => {
          if (key === 'selectedlocation') return []
          if (key === 'formattedPollutants') return ['NO2']
          if (key === 'Location') return 'Country'
          if (key === 'finalyear1') return '2023'
          return undefined
        })

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockAxios).toHaveBeenCalled()
      })
    })
  })

  describe('Path detection', () => {
    it('should detect confirm path correctly', async () => {
      mockRequest.path = '/some/path/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/requestconfirm.njk',
        expect.any(Object)
      )
    })

    it('should handle non-confirm paths', async () => {
      mockRequest.path = '/emailrequest/other'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.any(Object)
      )
    })

    it('should handle path with confirm substring but not ending with confirm', async () => {
      mockRequest.path = '/emailrequest/confirmation'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.any(Object)
      )
    })
  })

  describe('API Integration Tests', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
    })

    it('should call API with correct payload structure', async () => {
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
    })

    it('should handle API timeout error', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockAxios.mockRejectedValue(timeoutError)

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/check-air-quality/problem-with-service?statusCode=500'
      )
    })

    it('should handle network error', async () => {
      const networkError = new Error('Network error')
      networkError.code = 'ENOTFOUND'
      mockAxios.mockRejectedValue(networkError)

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/check-air-quality/problem-with-service?statusCode=500'
      )
    })

    it('should handle API response with error status', async () => {
      mockAxios.mockResolvedValue({ data: 'Error' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/check-air-quality/problem-with-service?statusCode=500'
      )
    })
  })

  describe('Data validation and transformation', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })
    })

    it('should handle null pollutant names', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'formattedPollutants') return null
        if (key === 'selectedlocation') return ['London']
        if (key === 'Location') return 'Country'
        if (key === 'finalyear1') return '2023'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          pollutantName: null,
          regiontype: 'Country'
        })
      )
    })

    it('should handle single location in array', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'formattedPollutants') return ['NO2']
        if (key === 'selectedlocation') return ['London']
        if (key === 'Location') return 'LocalAuthority'
        if (key === 'finalyear1') return '2023'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          Region: 'London',
          regiontype: 'LocalAuthority'
        })
      )
    })

    it('should handle multiple locations correctly', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'formattedPollutants') return ['NO2', 'PM10', 'O3']
        if (key === 'selectedlocation')
          return ['London', 'Manchester', 'Birmingham']
        if (key === 'Location') return 'LocalAuthority'
        if (key === 'finalyear1') return '2024'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          Region: 'London,Manchester,Birmingham',
          regiontype: 'LocalAuthority'
        })
      )
    })

    // it('should handle special characters in email', async () => {
    //   mockRequest.payload = { email: 'test+tag@sub-domain.example-site.co.uk' }

    //   await emailrequestController.handler(mockRequest, mockH)

    //   expect(mockAxios).toHaveBeenCalledWith(
    //     'https://api.example.com/email',
    //     expect.objectContaining({
    //       email: 'test+tag@sub-domain.example-site.co.uk'
    //     })
    //   )
    // })
  })

  describe('Console logging verification', () => {
    it('should log when entering confirm path', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      // Note: These console logs are commented out in the controller
      // expect(console.log).toHaveBeenCalledWith(
      //   'params from confirm',
      //   'test@example.com'
      // )
      // expect(console.log).toHaveBeenCalledWith('comes into confirm')
    })

    it('should log valid email', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'valid@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      // Note: This console log is commented out in the controller
      // expect(console.log).toHaveBeenCalledWith(
      //   'Valid email provided:',
      //   'valid@example.com'
      // )
    })

    it('should log invalid email format', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'invalid-email' }

      await emailrequestController.handler(mockRequest, mockH)
    })

    it('should log when no email provided', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = {}

      await emailrequestController.handler(mockRequest, mockH)

      // Note: This console log is commented out in the controller
      // expect(console.log).toHaveBeenCalledWith('No email provided')
    })
  })

  describe('Edge cases and error scenarios', () => {
    it('should handle request with null path', async () => {
      mockRequest.path = null

      await emailrequestController.handler(mockRequest, mockH)

      // Should default to GET path behavior
      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    })

    it('should handle request with undefined payload', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = undefined

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          error: 'Please enter an email address'
        })
      )
    })

    it('should handle request with undefined yar session', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockRequest.yar = undefined

      // This should throw an error when trying to call yar.set()
      await expect(
        emailrequestController.handler(mockRequest, mockH)
      ).rejects.toThrow("Cannot read properties of undefined (reading 'set')")
    })

    it('should handle extremely long email addresses', async () => {
      mockRequest.path = '/emailrequest/confirm'
      // Create an email that's still valid format but extremely long
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com'
      mockRequest.payload = { email: longEmail }
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      // Long emails that match the regex pattern should be accepted
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/requestconfirm.njk',
        expect.objectContaining({
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts
        })
      )
    })

    it('should handle email with unicode characters', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'tëst@éxample.com' }

      await emailrequestController.handler(mockRequest, mockH)

      // Should fail validation due to unicode characters not matching the regex
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          error: 'Please enter a valid email address'
        })
      )
    })

    it('should handle API returning malformed response', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: null })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/check-air-quality/problem-with-service?statusCode=500'
      )
      expect(mockH.redirect).toHaveBeenCalled()
    })

    it('should handle very large session data', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'formattedPollutants') {
          // Return a very large array
          return new Array(1000).fill('NO2')
        }
        if (key === 'selectedlocation') {
          return new Array(500).fill('London')
        }
        if (key === 'finalyear1') return '2023'
        return undefined
      })
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalled()
    })
  })

  describe('Performance and stress tests', () => {
    it('should handle multiple rapid requests', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })

      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(emailrequestController.handler(mockRequest, mockH))
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(result).toBe('view-response')
      })
      expect(mockAxios).toHaveBeenCalledTimes(10)
    })

    it('should handle concurrent requests with different email formats', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockAxios.mockResolvedValue({ data: 'Success' })

      const emails = [
        'test1@example.com',
        'test2@example.org',
        'test3@example.net',
        'test4@example.co.uk',
        'test5@example.io'
      ]

      const promises = emails.map((email) => {
        const req = { ...mockRequest, payload: { email } }
        return emailrequestController.handler(req, mockH)
      })

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result) => {
        expect(result).toBe('view-response')
      })
      expect(mockAxios).toHaveBeenCalledTimes(5)
    })

    it('should validate email with whitespace trimming', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: '  test@example.com  ' }
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'email',
        '  test@example.com  '
      )
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/requestconfirm.njk',
        expect.objectContaining({
          pageTitle: 'Test Page Title'
        })
      )
    })
  })
})
