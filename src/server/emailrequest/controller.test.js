import { emailrequestController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'

jest.mock('axios')
jest.mock('@hapi/wreck')
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
  let mockWreck
  let mockConfig

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      path: undefined,
      payload: {},
      query: {},
      params: {},
      info: {
        host: 'localhost:3001'
      },
      headers: {
        referer: 'http://localhost:3001/download_dataselector'
      },
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
    mockWreck = jest.mocked(Wreck.post)
    mockConfig = jest.mocked(config.get)
    mockConfig.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      if (key === 'email_URL') return 'https://api.example.com/email'
      return undefined
    })

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

    it('renders with JS backUrl when dataSource path param is provided', async () => {
      mockRequest.params = { dataSource: 'AURN' }

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

    it('shows error with JS backUrl when dataSource param and no email', async () => {
      mockRequest.payload = {}
      mockRequest.params = { dataSource: 'AURN' }

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
        if (key === 'isDevelopment') return false
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
        pollutantName: 'pollutant-id-123',
        dataSource: 'AURN', // selectedDatasourceType from session
        networkId: '',
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
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── POST /confirm — valid email success ──────────────────────────────────────

  describe('POST /emailrequest/confirm — valid email scenarios', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
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
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
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
        mockConfig.mockImplementation((key) => {
          if (key === 'isDevelopment') return false
          if (key === 'email_URL') return 'https://api.example.com/email'
          return undefined
        })
        mockRequest.yar.get.mockImplementation((key) => {
          const data = {
            selectedPollutantID: 'pollutant-id-123',
            selectedlocation: ['London'],
            selectedLAIDs: 'London',
            Location: 'LocalAuthority',
            finalyear1: '2023',
            selectedDatasourceType: 'AURN',
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

    it('redirects to problem-with-service when missing required session data', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedlocation') return []
        if (key === 'email') return 'test@example.com'
        return undefined
      })
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'email',
        'test@example.com'
      )
      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── Session data handling ────────────────────────────────────────────────────

  describe('Session data handling', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockAxios.mockResolvedValue({ data: 'Success' })
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
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
        if (key === 'selectedDatasourceType') return 'AURN'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          pollutantName: 'pollutant-id-123',
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

    it('redirects to problem-with-service for empty selectedlocation array for Country type', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedlocation') return []
        if (key === 'Location') return 'Country'
        if (key === 'finalyear1') return '2023'
        if (key === 'email') return 'test@example.com'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('handles single location', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutantID') return 'pollutant-id-123'
        if (key === 'selectedlocation') return ['London']
        if (key === 'selectedLAIDs') return 'London'
        if (key === 'Location') return 'LocalAuthority'
        if (key === 'finalyear1') return '2023'
        if (key === 'email') return 'test@example.com'
        if (key === 'selectedDatasourceType') return 'AURN'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          pollutantName: 'pollutant-id-123',
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
        if (key === 'selectedDatasourceType') return 'AURN'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          pollutantName: 'pollutant-id-123',
          Region: 'London,Manchester,Birmingham',
          regiontype: 'LocalAuthority'
        })
      )
    })

    it('redirects to problem-with-service when pollutant ID is null', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'selectedPollutantID') return null
        if (key === 'selectedlocation') return ['London']
        if (key === 'Location') return 'Country'
        if (key === 'finalyear1') return '2023'
        if (key === 'email') return 'test@example.com'
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── BackUrl logic ────────────────────────────────────────────────────────────

  describe('BackUrl logic', () => {
    it('uses /download_dataselector when dataSource path param is provided', async () => {
      mockRequest.params = { dataSource: 'AURN' }
      mockRequest.path = '/emailrequest/AURN'

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

    it('prioritises dataSource param over nojs referrer', async () => {
      mockRequest.params = { dataSource: 'AURN' }
      mockRequest.info = {
        referrer: 'http://example.com/download_dataselectornojs',
        host: 'localhost:3001'
      }
      mockRequest.path = '/emailrequest/AURN'

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
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
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

    it('renders index with JS backUrl for non-confirm path when dataSource param present', async () => {
      mockRequest.path = '/emailrequest/AURN'
      mockRequest.params = { dataSource: 'AURN' }

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
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
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

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects on network error', async () => {
      const err = new Error('Network error')
      err.code = 'ENOTFOUND'
      mockAxios.mockRejectedValue(err)

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects when API returns Error string', async () => {
      mockAxios.mockResolvedValue({ data: 'Error' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects when API returns null data', async () => {
      mockAxios.mockResolvedValue({ data: null })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
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
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })

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

    it('stores AURN in pendingDataSource when dataSource=AURN path param present', async () => {
      mockRequest.params = { dataSource: 'AURN' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'pendingDataSource',
        'AURN'
      )
    })

    it('stores NON-AURN in pendingDataSource when dataSource=NON-AURN path param present', async () => {
      mockRequest.params = { dataSource: 'NON-AURN' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'pendingDataSource',
        'NON-AURN'
      )
    })

    it('does not set pendingDataSource when dataSource path param is absent', async () => {
      mockRequest.params = {}

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'pendingDataSource',
        expect.anything()
      )
    })

    it('does not set pendingDataSource when dataSource path param is invalid', async () => {
      mockRequest.params = { dataSource: 'INVALID' }

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
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
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

    it('does not clear pendingDataSource when it is null', async () => {
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

      expect(mockRequest.yar.clear).toHaveBeenCalledTimes(2)
      expect(mockRequest.yar.clear).toHaveBeenCalledWith('pendingNetworkId')
      expect(mockRequest.yar.clear).toHaveBeenCalledWith('pendingPollutantID')
      expect(mockRequest.yar.clear).not.toHaveBeenCalledWith(
        'pendingDataSource'
      )
    })

    it('uses pendingPollutantID over derived network pollutantID for NON-AURN', async () => {
      mockRequest.params = { dataSource: 'NON-AURN' }
      mockRequest.query = { networkId: 'NET1', pollutantID: 'ONLY1' }

      const session = {
        selectedPollutantID: 'ALL1,ALL2,ALL3',
        selectedlocation: ['London'],
        selectedLAIDs: 'London',
        Location: 'LocalAuthority',
        finalyear1: '2023',
        email: 'test@example.com',
        selectedDatasourceType: 'NON-AURN',
        pendingDataSource: null,
        pendingNetworkId: 'NET1',
        pendingPollutantID: 'ONLY1',
        datasourceGroups: [
          {
            category: 'Other data from Defra',
            networks: [{ id: 'NET1', pollutantID: 'ALL1,ALL2,ALL3' }]
          }
        ]
      }

      mockRequest.yar.get.mockImplementation((key) => session[key])

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.objectContaining({
          dataSource: 'NON-AURN',
          networkId: 'NET1',
          pollutantName: 'ONLY1'
        })
      )
    })
  })

  // ─── Development mode API handling ────────────────────────────────────────────

  describe('Development mode API handling', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
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
    })

    it('uses Wreck.post in development mode', async () => {
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return true
        if (key === 'emailDevUrl') return 'https://dev.example.com/email'
        if (key === 'osNamesDevApiKey') return 'test-api-key'
        return undefined
      })
      mockWreck.mockResolvedValue({ payload: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockWreck).toHaveBeenCalledWith(
        'https://dev.example.com/email',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          }),
          json: true
        })
      )
      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/requestconfirm.njk',
        expect.any(Object)
      )
    })

    it('uses axios.post in production mode', async () => {
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
      mockAxios.mockResolvedValue({ data: 'Success' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).toHaveBeenCalledWith(
        'https://api.example.com/email',
        expect.any(Object)
      )
      expect(mockWreck).not.toHaveBeenCalled()
      expect(mockH.view).toHaveBeenCalledWith(
        'emailrequest/requestconfirm.njk',
        expect.any(Object)
      )
    })

    it('redirects to problem-with-service when Wreck throws error in dev mode', async () => {
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return true
        if (key === 'emailDevUrl') return 'https://dev.example.com/email'
        if (key === 'osNamesDevApiKey') return 'test-api-key'
        return undefined
      })
      mockWreck.mockRejectedValue(new Error('Dev API Error'))

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── XML error response handling ──────────────────────────────────────────────

  describe('XML error response handling', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
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
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
    })

    it('redirects to problem-with-service when API returns XML error', async () => {
      mockAxios.mockResolvedValue({
        data: '<?xml version="1.0"?><error>Internal Error</error>'
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects to problem-with-service when API returns null', async () => {
      mockAxios.mockResolvedValue({ data: null })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects to problem-with-service when API returns empty string', async () => {
      mockAxios.mockResolvedValue({ data: '' })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── Missing required parameters validation ───────────────────────────────────

  describe('Missing required parameters validation', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return false
        if (key === 'email_URL') return 'https://api.example.com/email'
        return undefined
      })
    })

    it('redirects to problem-with-service when pollutantName is missing', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: null,
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: 'test@example.com',
          selectedDatasourceType: 'AURN'
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects to problem-with-service when Region is empty', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: [],
          selectedLAIDs: '',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: 'test@example.com',
          selectedDatasourceType: 'AURN'
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects to problem-with-service when regiontype is null', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: null,
          finalyear1: '2023',
          email: 'test@example.com',
          selectedDatasourceType: 'AURN'
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects to problem-with-service when Year is undefined', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: undefined,
          email: 'test@example.com',
          selectedDatasourceType: 'AURN'
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects to problem-with-service when email is empty after storing', async () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: '',
          selectedDatasourceType: 'AURN'
        }
        return data[key]
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockAxios).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })

  // ─── Direct access guard (referer check) ──────────────────────────────────────

  describe('Direct access guard', () => {
    it('returns the 404 page when there is no internal navigation', async () => {
      mockRequest.path = '/emailrequest'
      mockRequest.headers = {} // no referer
      mockRequest.info = { host: 'localhost:3001' }

      const codeMock = jest.fn().mockReturnValue('404-response')
      const guardH = {
        view: jest.fn().mockReturnValue({ code: codeMock }),
        redirect: jest.fn()
      }

      const result = await emailrequestController.handler(mockRequest, guardH)

      expect(guardH.view).toHaveBeenCalledWith(
        'error/index',
        expect.objectContaining({ statusCode: '404' })
      )
      expect(codeMock).toHaveBeenCalledWith(404)
      expect(result).toBe('404-response')
    })
  })

  // ─── NON-AURN pendingNetworkId derivation ─────────────────────────────────────

  describe('NON-AURN pendingNetworkId', () => {
    it('stores query networkId when provided for NON-AURN', async () => {
      mockRequest.path = '/emailrequest'
      mockRequest.params = { dataSource: 'NON-AURN' }
      mockRequest.query = { networkId: 'NET9' }

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'pendingNetworkId',
        'NET9'
      )
    })

    it('stores derived network ids when dataSource is NON-AURN', async () => {
      mockRequest.path = '/emailrequest'
      mockRequest.params = { dataSource: 'NON-AURN' }
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'datasourceGroups') {
          return [
            {
              category: 'Other data from Defra',
              networks: [{ id: 'NET1' }, { id: 'NET2' }]
            }
          ]
        }
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'pendingNetworkId',
        'NET1,NET2'
      )
    })

    it('does not store pendingNetworkId when no network ids are derived', async () => {
      mockRequest.path = '/emailrequest'
      mockRequest.params = { dataSource: 'NON-AURN' }
      mockRequest.yar.get.mockImplementation((key) => {
        if (key === 'datasourceGroups') return []
        return undefined
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
        'pendingNetworkId',
        expect.anything()
      )
    })
  })

  // ─── Development mode invalid response ─────────────────────────────────────────

  describe('Development mode invalid response', () => {
    beforeEach(() => {
      mockRequest.path = '/emailrequest/confirm'
      mockRequest.payload = { email: 'test@example.com' }
      mockRequest.yar.get.mockImplementation((key) => {
        const data = {
          selectedPollutantID: 'pollutant-id-123',
          selectedlocation: ['London'],
          selectedLAIDs: 'London',
          Location: 'LocalAuthority',
          finalyear1: '2023',
          email: 'test@example.com',
          selectedDatasourceType: 'AURN'
        }
        return data[key]
      })
      mockConfig.mockImplementation((key) => {
        if (key === 'isDevelopment') return true
        if (key === 'emailDevUrl') return 'https://dev.example.com/email'
        if (key === 'osNamesDevApiKey') return 'test-api-key'
        return undefined
      })
    })

    it('redirects to problem-with-service when dev API returns empty payload', async () => {
      mockWreck.mockResolvedValue({ payload: null })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })

    it('redirects to problem-with-service when dev API returns XML payload', async () => {
      mockWreck.mockResolvedValue({
        payload: '<?xml version="1.0"?><error>boom</error>'
      })

      await emailrequestController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/problem-with-service')
    })
  })
})
