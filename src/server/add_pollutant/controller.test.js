import { airpollutantController } from './controller.js'
import axios from 'axios'
import Wreck from '@hapi/wreck'
import { config } from '~/src/config/config.js'
import {
  fetchDatasourceForPollutant,
  groupDatasources
} from '~/src/server/datasource/controller.js'

jest.mock('axios')
jest.mock('@hapi/wreck')
jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))
jest.mock('~/src/server/datasource/controller.js', () => ({
  fetchDatasourceForPollutant: jest.fn(),
  groupDatasources: jest.fn()
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Add Pollutant Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

const mockPollutantList = [
  {
    pollutantID: '1',
    pollutantName: 'Fine particulate matter (PM2.5)',
    pollutant_value: 'Fine particulate matter (PM2.5)',
    pollutant_Abbreviation: 'PM2.5'
  },
  {
    pollutantID: '2',
    pollutantName: 'Particulate matter (PM10)',
    pollutant_value: 'Particulate matter (PM10)',
    pollutant_Abbreviation: 'PM10'
  },
  {
    pollutantID: '3',
    pollutantName: 'Nitrogen dioxide (NO2)',
    pollutant_value: 'Nitrogen dioxide (NO2)',
    pollutant_Abbreviation: 'NO2'
  },
  {
    pollutantID: '4',
    pollutantName: 'Ozone (O3)',
    pollutant_value: 'Ozone (O3)',
    pollutant_Abbreviation: 'O3'
  },
  {
    pollutantID: '5',
    pollutantName: 'Sulphur dioxide (SO2)',
    pollutant_value: 'Sulphur dioxide (SO2)',
    pollutant_Abbreviation: 'SO2'
  },
  {
    pollutantID: '6',
    pollutantName: 'Nitric oxide (NO)',
    pollutant_value: 'Nitric oxide (NO)',
    pollutant_Abbreviation: 'NO'
  },
  {
    pollutantID: '7',
    pollutantName: 'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
    pollutant_value: 'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
    pollutant_Abbreviation: 'NOx'
  },
  {
    pollutantID: '8',
    pollutantName: 'Carbon monoxide (CO)',
    pollutant_value: 'Carbon monoxide (CO)',
    pollutant_Abbreviation: 'CO'
  },
  {
    pollutantID: '9',
    pollutantName: 'PM10',
    pollutant_value: 'PM10',
    pollutant_Abbreviation: 'PM10'
  }
]

function makeRequest(overrides = {}) {
  return {
    method: 'get',
    yar: {
      set: jest.fn(),
      get: jest.fn().mockReturnValue(null)
    },
    payload: {},
    query: {},
    path: '/add_pollutant',
    headers: {},
    ...overrides
  }
}

function makeH() {
  return {
    view: jest.fn().mockReturnValue('view-response'),
    redirect: jest.fn().mockReturnValue('redirect-response')
  }
}

// ─── GET ───────────────────────────────────────────────────────────────────────

describe('airpollutantController GET requests', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = makeRequest()
    mockH = makeH()
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      return 'http://mock-url'
    })
    axios.get.mockResolvedValue({ data: mockPollutantList })
    fetchDatasourceForPollutant.mockResolvedValue([])
    groupDatasources.mockReturnValue([])
  })

  it('fetches pollutant list (prod) and renders view with defaults', async () => {
    await airpollutantController.handler(mockRequest, mockH)
    expect(axios.get).toHaveBeenCalled()
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'pollutantMasterList',
      mockPollutantList
    )
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        pageTitle: 'Test Add Pollutant Page',
        heading: 'Test Heading',
        displayBacklink: true,
        hrefq: '/customdataset',
        selectedPollutants: [],
        selectedMode: '',
        selectedGroup: ''
      })
    )
  })

  it('redirects to problem-with-service when axios throws (prod)', async () => {
    axios.get.mockRejectedValue(new Error('Network error'))
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.redirect).toHaveBeenCalledWith(
      '/problem-with-service?statusCode=500'
    )
  })

  it('treats non-array axios response as empty pollutant list', async () => {
    axios.get.mockResolvedValue({ data: 'not-an-array' })
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({ pollutants: [] })
    )
  })

  it('fetches pollutant list via Wreck in development mode', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return true
      return 'http://mock-dev-url'
    })
    Wreck.get.mockResolvedValue({ payload: mockPollutantList })
    await airpollutantController.handler(mockRequest, mockH)
    expect(Wreck.get).toHaveBeenCalled()
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({ pollutants: mockPollutantList })
    )
  })

  it('redirects to problem-with-service when Wreck throws (dev)', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return true
      return 'http://mock-dev-url'
    })
    Wreck.get.mockRejectedValue(new Error('Wreck error'))
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.redirect).toHaveBeenCalledWith(
      '/problem-with-service?statusCode=500'
    )
  })

  it('treats non-array Wreck payload as empty pollutant list (dev)', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return true
      return 'http://mock-dev-url'
    })
    Wreck.get.mockResolvedValue({ payload: 'not-an-array' })
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({ pollutants: [] })
    )
  })

  it('clears session fields on GET', async () => {
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
  })

  it('pre-populates form from session (specific mode)', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      switch (key) {
        case 'selectedPollutants':
          return ['Nitrogen dioxide (NO2)', 'Particulate matter (PM10)']
        case 'selectedPollutantMode':
          return 'specific'
        default:
          return null
      }
    })
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        selectedPollutants: [
          'Nitrogen dioxide (NO2)',
          'Particulate matter (PM10)'
        ],
        selectedMode: 'specific',
        selectedGroup: ''
      })
    )
  })

  it('pre-populates group from session when mode is group', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedPollutantMode') return 'group'
      if (key === 'selectedPollutantGroup') return 'core'
      return null
    })
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({ selectedMode: 'group', selectedGroup: 'core' })
    )
  })

  it('renders no-JS template when nojs query parameter is true', async () => {
    mockRequest.query = { nojs: 'true' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })

  it('renders no-JS template when path includes nojs', async () => {
    mockRequest.path = '/add_pollutant/nojs'
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })

  it('renders no-JS template when user-agent contains noscript', async () => {
    mockRequest.headers = { 'user-agent': 'SomeBot/1.0 (noscript)' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })

  it('sets backlink flags', async () => {
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    )
  })
})

// ─── POST validation errors ────────────────────────────────────────────────────

describe('airpollutantController POST validation errors', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = makeRequest({ method: 'post' })
    mockH = makeH()
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'pollutantMasterList') return mockPollutantList
      return null
    })
    fetchDatasourceForPollutant.mockResolvedValue([])
    groupDatasources.mockReturnValue([])
  })

  it('returns error when no mode is selected', async () => {
    mockRequest.payload = {}
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [
            {
              text: 'Select an option before continuing',
              href: '#mode-specific'
            }
          ]
        },
        errorMessage: {
          message: { text: 'Select an option before continuing' }
        }
      })
    )
  })

  it('returns error when group mode selected but no group chosen', async () => {
    mockRequest.payload = { 'pollutant-mode': 'group' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [{ text: 'Select a pollutant group', href: '#pg-core' }]
        },
        selectedMode: 'group',
        selectedGroup: undefined
      })
    )
  })

  it('returns error when specific mode selected but no pollutants', async () => {
    mockRequest.payload = { 'pollutant-mode': 'specific' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [
            {
              text: 'Please add at least one pollutant',
              href: '#my-autocomplete'
            }
          ]
        },
        errorMessage: {
          message: { text: 'Please add at least one pollutant' }
        },
        selectedMode: 'specific',
        selectedPollutants: []
      })
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantGroup',
      ''
    )
  })

  it('does not resurrect old session pollutants when no pollutants are submitted', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedpollutants_specific')
        return ['Nitrogen dioxide (NO2)']
      return null
    })
    mockRequest.payload = { 'pollutant-mode': 'specific' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({ selectedPollutants: [] })
    )
  })

  it('returns error when specific mode has invalid JSON in selectedPollutants', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: '[not-valid-json'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: expect.arrayContaining([
            {
              text: 'Invalid pollutants data format.',
              href: '#selected-pollutants'
            }
          ])
        },
        errorMessage: {
          message: { text: 'Invalid pollutants data format.' }
        },
        selectedMode: 'specific',
        selectedPollutants: []
      })
    )
  })

  it('returns error when invalid pollutants provided', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify([
        'Invalid Pollutant',
        'Another Invalid One'
      ])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [
            {
              text: 'Invalid pollutant(s): Invalid Pollutant, Another Invalid One. Select from the allowed list.',
              href: '#my-autocomplete'
            }
          ]
        },
        errorMessage: {
          message: { text: expect.stringContaining('Invalid pollutant(s)') }
        }
      })
    )
  })

  it('returns error when duplicate pollutants provided', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify([
        'Nitrogen dioxide (NO2)',
        'Nitrogen dioxide (NO2)',
        'Particulate matter (PM10)'
      ])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [
            {
              text: 'Duplicate pollutant(s): Nitrogen dioxide (NO2) have already been added.',
              href: '#my-autocomplete'
            }
          ]
        },
        errorMessage: {
          message: { text: expect.stringContaining('Duplicate pollutant(s)') }
        }
      })
    )
  })

  it('uses no-JS template when nojs query is true', async () => {
    mockRequest.payload = {}
    mockRequest.query = { nojs: 'true' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.objectContaining({
        errors: expect.any(Object),
        errorMessage: expect.any(Object)
      })
    )
  })

  it('uses no-JS template when path contains nojs', async () => {
    mockRequest.payload = { 'pollutant-mode': 'specific' }
    mockRequest.path = '/add_pollutant/nojs'
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })

  it('uses no-JS template when user-agent contains noscript', async () => {
    mockRequest.payload = { 'pollutant-mode': 'group' }
    mockRequest.headers = { 'user-agent': 'Mozilla/5.0 (compatible; noscript)' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })

  it('uses noJS anchor (#selected-pollutants) for invalid pollutant when nojs path', async () => {
    mockRequest.path = '/add_pollutant/nojs'
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      'selected-pollutants': 'Invalid Pollutant'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.objectContaining({
        errors: {
          list: expect.arrayContaining([
            expect.objectContaining({ href: '#selected-pollutants' })
          ])
        }
      })
    )
  })

  it('preserves form state on validation fail (specific mode)', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      'pollutant-group': 'core',
      selectedPollutants: JSON.stringify(['Invalid'])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        selectedMode: 'specific',
        selectedGroup: '',
        selectedPollutants: ['Invalid']
      })
    )
  })

  it('preserves form state on validation fail (group mode)', async () => {
    mockRequest.payload = { 'pollutant-mode': 'group' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        selectedMode: 'group',
        selectedGroup: undefined,
        selectedPollutants: []
      })
    )
  })

  it('handles empty pollutants array (JSON stringify)', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify([])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [
            {
              text: 'Please add at least one pollutant',
              href: '#my-autocomplete'
            }
          ]
        },
        errorMessage: {
          message: { text: 'Please add at least one pollutant' }
        }
      })
    )
  })

  it('handles lone bracket string as empty (parsePollutantsData edge case)', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: '['
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [
            {
              text: 'Please add at least one pollutant',
              href: '#my-autocomplete'
            }
          ]
        }
      })
    )
  })

  it('handles null or undefined request payload', async () => {
    mockRequest.payload = null
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: [
            {
              text: 'Select an option before continuing',
              href: '#mode-specific'
            }
          ]
        },
        errorMessage: {
          message: { text: 'Select an option before continuing' }
        }
      })
    )
  })

  it('handles multiple validation errors at once (invalid + duplicate)', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify([
        'Invalid Pollutant',
        'Nitrogen dioxide (NO2)',
        'nitrogen dioxide (NO2)'
      ])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        errors: {
          list: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining('Invalid pollutant(s)')
            }),
            expect.objectContaining({
              text: expect.stringContaining('Duplicate pollutant(s)')
            })
          ])
        }
      })
    )
  })
})

// ─── POST success ──────────────────────────────────────────────────────────────

describe('airpollutantController POST success scenarios', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = makeRequest({ method: 'post' })
    mockH = makeH()
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'pollutantMasterList') return mockPollutantList
      return null
    })
    fetchDatasourceForPollutant.mockResolvedValue([])
    groupDatasources.mockReturnValue([])
  })

  it('handles core group selection successfully', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'group',
      'pollutant-group': 'core'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      'Fine particulate matter (PM2.5)',
      'Particulate matter (PM10)',
      'Nitrogen dioxide (NO2)',
      'Ozone (O3)',
      'Sulphur dioxide (SO2)'
    ])
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantMode',
      'group'
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantGroup',
      'core'
    )
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('handles compliance group selection successfully', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'group',
      'pollutant-group': 'compliance'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      'Fine particulate matter (PM2.5)',
      'Particulate matter (PM10)',
      'Nitrogen dioxide (NO2)',
      'Ozone (O3)',
      'Sulphur dioxide (SO2)',
      'Nitric oxide (NO)',
      'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
      'Carbon monoxide (CO)'
    ])
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantMode',
      'group'
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantGroup',
      'compliance'
    )
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('handles specific pollutants selection successfully', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify([
        'Nitrogen dioxide (NO2)',
        'Particulate matter (PM10)',
        'Ozone (O3)'
      ])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      'Nitrogen dioxide (NO2)',
      'Particulate matter (PM10)',
      'Ozone (O3)'
    ])
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantMode',
      'specific'
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantGroup',
      ''
    )
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('sets selectedPollutantID and calls fetchDatasourceForPollutant when pollutant matched', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify(['Nitrogen dioxide (NO2)'])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutantID', '3')
    expect(fetchDatasourceForPollutant).toHaveBeenCalledWith('3')
    expect(groupDatasources).toHaveBeenCalledWith([])
    expect(mockRequest.yar.set).toHaveBeenCalledWith('datasourceGroups', [])
  })

  it('sets empty datasourceGroups when no pollutant match in master list', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'group',
      'pollutant-group': 'core'
    }
    // core group first item is 'Fine particulate matter (PM2.5)'
    // matched check uses pollutant_value exact match; core group pollutant IS in list
    // so fetchDatasourceForPollutant IS called here - change to unknown group
    mockRequest.payload = {
      'pollutant-mode': 'group',
      'pollutant-group': 'unknown'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('datasourceGroups', [])
    expect(fetchDatasourceForPollutant).not.toHaveBeenCalled()
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('redirects to problem-with-service when fetchDatasourceForPollutant returns null', async () => {
    fetchDatasourceForPollutant.mockResolvedValue(null)
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify(['Nitrogen dioxide (NO2)'])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.redirect).toHaveBeenCalledWith(
      '/problem-with-service?statusCode=500'
    )
  })

  it('handles no-JS dropdown selection in specific mode', async () => {
    mockRequest.query = { nojs: 'true' }
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      'selected-pollutants': 'PM10'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantGroup',
      ''
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      'PM10'
    ])
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantMode',
      'specific'
    )
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('reads noJS specific pollutants from session when no dropdown submitted', async () => {
    mockRequest.path = '/add_pollutant/nojs'
    mockRequest.payload = { 'pollutant-mode': 'specific' }
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'pollutantMasterList') return mockPollutantList
      if (key === 'selectedpollutants_specific')
        return ['Nitrogen dioxide (NO2)']
      return null
    })
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      'Nitrogen dioxide (NO2)'
    ])
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('clears prior selections when switching modes', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedPollutantMode') return 'specific'
      if (key === 'pollutantMasterList') return mockPollutantList
      return null
    })
    mockRequest.payload = {
      'pollutant-mode': 'group',
      'pollutant-group': 'core'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [])
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantGroup',
      ''
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantMode',
      'group'
    )
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('handles unknown group gracefully', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'group',
      'pollutant-group': 'unknown'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [])
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantMode',
      'group'
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantGroup',
      'unknown'
    )
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('handles JSON string pollutants data', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants:
        '["Nitrogen dioxide (NO2)", "Particulate matter (PM10)"]'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      'Nitrogen dioxide (NO2)',
      'Particulate matter (PM10)'
    ])
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedPollutantMode',
      'specific'
    )
    expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('handles whitespace-padded pollutants and redirects', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'specific',
      selectedPollutants: JSON.stringify([
        '  Nitrogen dioxide (NO2)  ',
        ' Particulate matter (PM10) ',
        'Ozone (O3)'
      ])
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      '  Nitrogen dioxide (NO2)  ',
      ' Particulate matter (PM10) ',
      'Ozone (O3)'
    ])
    expect(mockH.redirect).toHaveBeenCalled()
  })

  it('uses no-JS template for POST when path contains nojs and no mode error', async () => {
    mockRequest.payload = { 'pollutant-mode': 'specific' }
    mockRequest.path = '/add_pollutant/nojs'
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })

  it('uses no-JS template for POST when UA contains noscript and no mode error', async () => {
    mockRequest.payload = { 'pollutant-mode': 'group' }
    mockRequest.headers = { 'user-agent': 'Mozilla/5.0 (compatible; noscript)' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })
})
