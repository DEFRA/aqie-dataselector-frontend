import { emailrequestController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'

jest.mock('axios')
jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Page Title',
      heading: 'Test Heading',
      texts: 'Test Texts'
    }
  }
}))

describe('emailrequestController', () => {
  let mockRequest
  let mockH
  let mockAxios
  let mockConfig

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      path: undefined,
      payload: {},
      query: {},
      info: {},
      yar: {
        get: jest.fn(),
        set: jest.fn(),
        clear: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    mockAxios = jest.mocked(axios.post)
    mockConfig = jest.mocked(config.get)
    mockConfig.mockReturnValue('https://api.example.com/email')

    mockRequest.yar.get.mockImplementation((key) => {
      const mockData = {
        selectedPollutantID: 'pollutant-id-123',
        selectedlocation: ['London', 'Manchester'],
        selectedLAIDs: 'London,Manchester',
        Location: 'LocalAuthority',
        finalyear1: '2023',
        email: 'test@example.com',
        selectedDatasourceType: 'AURN',
        pendingDataSource: null
      }
      return mockData[key]
    })

    mockAxios.mockResolvedValue({ data: 'Success' })
  })

  // ─── GET (default path) ───────────────────────────────────────────────────────

  describe('GET /emailrequest (default path)', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest'
    })

    it('renders the email request form with no-JS backUrl by default', async () => {
      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
    })

    it('renders with JS backUrl when js=true query param', async () => {
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

    it('renders with JS backUrl when referrer is from JS download page', async () => {
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

    it('renders with no-JS backUrl when referrer is from nojs page', async () => {
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

    it('handles missing path (undefined) with no-JS backUrl', async () => {
      mockRequest.path = undefined

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
    })
  })

  // ─── POST /confirm — email validation ────────────────────────────────────────

  describe('POST /emailrequest/confirm — email validation', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
    })

    it('shows error when no email provided', async () => {
      mockRequest.payload = {}

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs',
        error: 'Enter an email address',
        email: undefined
      })
    })

    it('shows error with JS backUrl when js=true and no email', async () => {
      mockRequest.payload = {}
      mockRequest.query = { js: 'true' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselector',
        error: 'Enter an email address',
        email: undefined
      })
    })

    it('shows error when email is null', async () => {
      mockRequest.payload = { email: null }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs',
        error: 'Enter an email address',
        email: null
      })
    })

    it('shows error when email is empty string', async () => {
      mockRequest.payload = { email: '' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs',
        error: 'Enter an email address',
        email: ''
      })
    })

    it('shows invalid format error when email is a number', async () => {
      mockRequest.payload = { email: 123 }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs',
        error: 'Enter a valid email address',
        email: 123
      })
    })

    it('shows invalid format error for email missing @', async () => {
      mockRequest.payload = { email: 'invalidemailformat' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs',
        error: 'Enter a valid email address',
        email: 'invalidemailformat'
      })
    })

    it('shows invalid format error for email missing domain', async () => {
      mockRequest.payload = { email: 'test@' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs',
        error: 'Enter a valid email address',
        email: 'test@'
      })
    })

    it('shows invalid format error for email missing TLD', async () => {
      mockRequest.payload = { email: 'test@domain' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs',
        error: 'Enter a valid email address',
        email: 'test@domain'
      })
    })

    it('accepts valid email, calls API and renders confirm view', async () => {
      mockRequest.payload = { email: 'test@example.com' }
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
      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedPollutantID')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('Location')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedLAIDs')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('finalyear1')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('email')
      expect(mockConfig).toHaveBeenCalledWith('email_URL')
      expect(mockAxios).toHaveBeenCalledWith('https://api.example.com/email', {
        pollutantId: 'pollutant-id-123',
        dataSource: 'AURN', // selectedDatasourceType from session
        Region: 'London,Manchester',
        regiontype: 'LocalAuthority',
        Year: '2023',
        dataselectorfiltertype: 'dataSelectorHourly',
        dataselectordownloadtype: 'dataSelectorMultiple',
        email: 'test@example.com'
      })
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/requestconfirm.njk',
        {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts
        }
      )
    })

    it('redirects to problem-with-service when API returns non-Success', async () => {
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Failed' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/problem-with-service?statusCode=500'
      )
    })
  })

  // ─── POST /confirm — valid email success ──────────────────────────────────────

  describe('POST /emailrequest/confirm — valid email scenarios', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

    it('successfully processes valid email and renders confirm view', async () => {
      mockAxios.mockResolvedValue({ data: 'Success' })

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

    it('redirects to problem-with-service when API throws', async () => {
      mockAxios.mockRejectedValue(new Error('API Error'))

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/problem-with-service?statusCode=500'
      )
    })

    it('accepts a variety of valid email formats', async () => {
      const validEmails = [
        'user@domain.com',
        'user.name@domain.co.uk',
        'user+tag@domain.org',
        'user123@domain123.net',
        'a@b.co',
        'test_email@example-domain.com',
        'simple@test.io'
      ]

      for (const email of validEmails) {
        jest.clearAllMocks()
        mockConfig.mockReturnValue('https://api.example.com/email')
        mockRequest.yar.get.mockImplementation((key) => {
          const data = {
            selectedPollutantID: 'pollutant-id-123',
            selectedlocation: ['London'],
            selectedLAIDs: 'London',
            Location: 'LocalAuthority',
            finalyear1: '2023',
            email
          }
          return data[key]
        })
        mockRequest.payload = { email }
        mockAxios.mockResolvedValue({ data: 'Success' })

        await emailrequestController.handler(mockRequest, mockH)

        expect(mockRequest.yar.set).toHaveBeenCalledWith('email', email)
        expect(mockH.view).toHaveBeenCalledWith(
          'emailrequest/requestconfirm.njk',
          expect.objectContaining({ pageTitle: 'Test Page Title' })
        )
      }
    })

    it('handles missing session data gracefully', async () => {
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

  // ─── Session data handling ────────────────────────────────────────────────────

  describe('Session data handling', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

    it('reads all required session keys', async () => {
      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'email',
        'test@example.com'
      )
      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedPollutantID')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('Location')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedLAIDs')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('finalyear1')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('email')
    })

    it('uses selectedlocation.join for Country region type', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutantID') return 'pollutant-id-123'
        if (key === 'selectedlocation') return ['London', 'Manchester']
        if (key === 'Location') return 'Country'
        if (key === 'finalyear1') return '2023'
        if (key === 'email') return 'test@example.com'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          Region: 'London,Manchester',
          regiontype: 'Country'
        })
      )
    })

    it('uses selectedLAIDs for LocalAuthority region type', async () => {
      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          Region: 'London,Manchester',
          regiontype: 'LocalAuthority'
        })
      )
    })

    it('handles empty selectedlocation array for Country type', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedlocation') return []
        if (key === 'Location') return 'Country'
        if (key === 'finalyear1') return '2023'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({ Region: '', regiontype: 'Country' })
      )
    })

    it('handles single location', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutantID') return 'pollutant-id-123'
        if (key === 'selectedlocation') return ['London']
        if (key === 'selectedLAIDs') return 'London'
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

    it('handles multiple locations', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutantID') return 'pollutant-id-123'
        if (key === 'selectedlocation')
          return ['London', 'Manchester', 'Birmingham']
        if (key === 'selectedLAIDs') return 'London,Manchester,Birmingham'
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

    it('handles null pollutant ID', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutantID') return null
        if (key === 'selectedlocation') return ['London']
        if (key === 'Location') return 'Country'
        if (key === 'finalyear1') return '2023'
        if (key === 'email') return 'test@example.com'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({ pollutantId: null, regiontype: 'Country' })
      )
    })
  })

  // ─── BackUrl logic ────────────────────────────────────────────────────────────

  describe('BackUrl logic', () => {
    it('uses /download_dataselector when js=true query param', async () => {
      mockRequest.query = { js: 'true' }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselector' })
      )
    })

    it('uses /download_dataselectornojs when js param is not true', async () => {
      mockRequest.query = { js: 'false' }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselectornojs' })
      )
    })

    it('uses /download_dataselector when referrer includes /download_dataselector (no nojs)', async () => {
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselector'
      }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselector' })
      )
    })

    it('uses /download_dataselectornojs when referrer includes nojs', async () => {
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselectornojs'
      }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselectornojs' })
      )
    })

    it('uses /download_dataselectornojs when no referrer and no js param', async () => {
      mockRequest.info = {}
      mockRequest.query = {}
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselectornojs' })
      )
    })

    it('prioritises js=true query param over nojs referrer', async () => {
      mockRequest.query = { js: 'true' }
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselectornojs'
      }
      mockRequest.path = '/emailrequest'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselector' })
      )
    })
  })

  // ─── Path detection ───────────────────────────────────────────────────────────

  describe('Path detection', () => {
    beforeEach(() => {
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

    it('enters confirm branch for any path containing /confirm', async () => {
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

    it('renders index for non-confirm paths', async () => {
      mockRequest.path = '/emailrequest/other'

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselectornojs' })
      )
    })

    it('renders index with JS backUrl for non-confirm path when js=true', async () => {
      mockRequest.path = '/emailrequest/other'
      mockRequest.query = { js: 'true' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({ hrefq: '/download_dataselector' })
      )
    })
  })

  // ─── API integration ──────────────────────────────────────────────────────────

  describe('API integration', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

    it('calls API with correct config key (email_URL)', async () => {
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockConfig).toHaveBeenCalledWith('email_URL')
      expect(mockAxios).toHaveBeenCalled()
    })

    it('redirects on API timeout error', async () => {
      const err = new Error('Request timeout')
      err.name = 'TimeoutError'
      mockAxios.mockRejectedValue(err)

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/problem-with-service?statusCode=500'
      )
    })

    it('redirects on network error', async () => {
      const err = new Error('Network error')
      err.code = 'ENOTFOUND'
      mockAxios.mockRejectedValue(err)

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/problem-with-service?statusCode=500'
      )
    })

    it('redirects when API returns Error string', async () => {
      mockAxios.mockResolvedValue({ data: 'Error' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/problem-with-service?statusCode=500'
      )
    })

    it('redirects when API returns null data', async () => {
      mockAxios.mockResolvedValue({ data: null })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith(
        '/problem-with-service?statusCode=500'
      )
    })
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles null path (falls through to else branch)', async () => {
      mockRequest.path = null

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('emailrequest/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/download_dataselectornojs'
      })
    })

    it('handles undefined payload on confirm path (shows empty email error)', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = undefined

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          error: 'Enter an email address',
          hrefq: '/download_dataselectornojs'
        })
      )
    })

    it('rejects unicode characters in email', async () => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'tëst@éxample.com' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/index',
        expect.objectContaining({
          error: 'Enter a valid email address',
          hrefq: '/download_dataselectornojs'
        })
      )
    })

    it('accepts email with surrounding whitespace (trimmed for regex, stored as-is)', async () => {
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
        expect.objectContaining({ pageTitle: 'Test Page Title' })
      )
    })
  })

  // ─── dataSource query param & pendingDataSource ───────────────────────────────

  describe('dataSource query param handling (GET)', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest'
    })

    it('stores AURN in pendingDataSource when dataSource=AURN query param present', async () => {
      mockRequest.query = { dataSource: 'AURN' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'pendingDataSource',
        'AURN'
      )
    })

    it('stores NON-AURN in pendingDataSource when dataSource=NON-AURN query param present', async () => {
      mockRequest.query = { dataSource: 'NON-AURN' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'pendingDataSource',
        'NON-AURN'
      )
    })

    it('does not set pendingDataSource when dataSource query param is absent', async () => {
      mockRequest.query = {}

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'pendingDataSource',
        expect.anything()
      )
    })

    it('does not set pendingDataSource when dataSource query param is invalid', async () => {
      mockRequest.query = { dataSource: 'INVALID' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'pendingDataSource',
        expect.anything()
      )
    })
  })

  describe('pendingDataSource applied on POST confirm', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })
      mockConfig.mockReturnValue('https://api.example.com/email')
    })

    it('applies pendingDataSource to selectedDatasourceType and clears it before API call', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: 'test@example.com',
          pendingDataSource: 'NON-AURN',
          selectedDatasourceType: 'NON-AURN'
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedDatasourceType',
        'NON-AURN'
      )
      expect(mockRequest.yar.clear).toHaveBeenCalledWith('pendingDataSource')
      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({ dataSource: 'NON-AURN' })
      )
    })

    it('calls API with NON-AURN when selectedDatasourceType is NON-AURN and no pendingDataSource', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: 'test@example.com',
          selectedDatasourceType: 'NON-AURN',
          pendingDataSource: null
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({ dataSource: 'NON-AURN' })
      )
    })

    it('falls back to AURN when neither selectedDatasourceType nor pendingDataSource is set', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: 'test@example.com',
          selectedDatasourceType: null,
          pendingDataSource: null
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({ dataSource: 'AURN' })
      )
    })

    it('does not call yar.clear when pendingDataSource is null', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: 'test@example.com',
          selectedDatasourceType: 'AURN',
          pendingDataSource: null
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.clear).not.toHaveBeenCalled()
    })
  })
})
