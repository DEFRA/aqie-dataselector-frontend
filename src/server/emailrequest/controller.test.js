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
      query: {},
      info: {},
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

    it('should render the email request form with correct data (no-JS default)', async () => {
      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
      expect(mockH.view).toHaveBeenCalled()
    })

    it('should render with JS backUrl when js=true query param', async () => {
      mockRequest.query = { js: 'true' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselector'
      })
    })

    it('should render with JS backUrl when referrer is from JS page', async () => {
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselector'
      }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselector'
      })
    })

    it('should render with no-JS backUrl when referrer is from nojs page', async () => {
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselectornojs'
      }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
    })

    it('should handle missing path correctly', async () => {
      mockRequest.path = undefined

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs' // match controller
      })
      expect(mockH.view).toHaveBeenCalled()
    })
  })

  describe('POST /emailrequest/confirm (confirm path)', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
    })

    describe('Email validation', () => {
      it('should show error when no email is provided (no-JS default)', async () => {
        mockRequest.payload = {}

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/download_dataselectornojs',
          error: 'Please enter an email address',
          email: undefined
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should show error with JS backUrl when js=true param', async () => {
        mockRequest.payload = {}
        mockRequest.query = { js: 'true' }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/download_dataselector',
          error: 'Please enter an email address',
          email: undefined
        })
      })

      it('should show error when email is null', async () => {
        mockRequest.payload = { email: null }

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/download_dataselectornojs', // match controller
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
          hrefq: '/download_dataselectornojs', // match controller
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
          hrefq: '/download_dataselectornojs', // match controller
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
          hrefq: '/download_dataselectornojs', // match controller
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
          hrefq: '/download_dataselectornojs', // match controller
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
          hrefq: '/download_dataselectornojs', // match controller
          error: 'Please enter a valid email address',
          email: 'test@domain'
        })
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should accept valid email and call API correctly', async () => {
        mockRequest.payload = { email: 'test@example.com' }

        // Setup mock to use config.get('email_URL') as the controller does
        mockConfig.mockImplementation((key) => {
          if (key === 'email_URL') return 'https://api.example.com/email'
          return undefined
        })

        mockAxios.mockResolvedValue({ data: 'Success' })

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
        expect(mockConfig).toHaveBeenCalledWith('email_URL')
        expect(mockAxios).toHaveBeenCalledWith(
          'https://api.example.com/email',
          {
            pollutantName: ['NO2', 'PM10'],
            dataSource: 'AURN',
            Region: 'London,Manchester',
            regiontype: 'LocalAuthority',
            Year: '2023',
            dataselectorfiltertype: 'dataSelectorHourly',
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
        mockConfig.mockReturnValue('https://api.example.com/email')

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
        mockConfig.mockReturnValue('https://api.example.com/email')
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
        mockConfig.mockReturnValue('https://api.example.com/email')
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
    beforeEach(() => {
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

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

    it('should handle non-confirm paths with default no-JS backUrl', async () => {
      mockRequest.path = '/emailrequest/other'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          hrefq: '/download_dataselectornojs'
        })
      )
    })

    it('should handle non-confirm paths with JS backUrl when js=true', async () => {
      mockRequest.path = '/emailrequest/other'
      mockRequest.query = { js: 'true' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          hrefq: '/download_dataselector'
        })
      )
    })

    it('should handle path with confirm substring but not ending with confirm', async () => {
      mockRequest.path = '/emailrequest/confirmation'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          hrefq: '/download_dataselectornojs'
        })
      )
    })
  })

  describe('BackUrl logic (query param and referrer)', () => {
    it('should use /download_dataselector when query param js=true', async () => {
      mockRequest.query = { js: 'true' }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselector'
      })
    })

    it('should use /download_dataselectornojs when query param js is not true', async () => {
      mockRequest.query = { js: 'false' }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
    })

    it('should use /download_dataselector when referrer includes /download_dataselector (without nojs)', async () => {
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselector'
      }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselector'
      })
    })

    it('should use /download_dataselectornojs when referrer includes /download_dataselectornojs', async () => {
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselectornojs'
      }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
    })

    it('should use /download_dataselectornojs when no referrer and no js param', async () => {
      mockRequest.info = {}
      mockRequest.query = {}
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
    })

    it('should prioritize js=true query param over referrer', async () => {
      mockRequest.query = { js: 'true' }
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselectornojs'
      }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselector'
      })
    })
  })

  describe('API Integration Tests', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

    it('should call API with correct config key', async () => {
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockConfig).toHaveBeenCalledWith('email_URL') // Updated to match controller
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

    it('should handle API response with null data', async () => {
      mockAxios.mockResolvedValue({ data: null })

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
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

    it('should handle null pollutant names', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'formattedPollutants') return null
        if (key === 'selectedlocation') return ['London']
        if (key === 'Location') return 'Country'
        if (key === 'finalyear1') return '2023'
        if (key === 'email') return 'test@example.com'
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
        if (key === 'email') return 'test@example.com'
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
        if (key === 'email') return 'test@example.com'
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
        hrefq: '/download_dataselectornojs' // match controller
      })
    })

    it('should handle request with undefined payload', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = undefined

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          error: 'Please enter an email address',
          hrefq: '/download_dataselectornojs' // match controller
        })
      )
    })

    it('should handle unicode characters in email correctly', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'tëst@éxample.com' }

      await emailrequestController.handler(mockRequest, mockH)

      // Should fail validation due to unicode characters not matching the regex
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          error: 'Please enter a valid email address',
          hrefq: '/download_dataselectornojs' // match controller
        })
      )
    })

    it('should validate email with whitespace trimming', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: '  test@example.com  ' }
      mockAxios.mockResolvedValue({ data: 'Success' })
      mockConfig.mockReturnValue('https://api.example.com/email')

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
