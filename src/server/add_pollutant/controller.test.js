import { airpollutantController } from './controller.js'

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Add Pollutant Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

describe('airpollutantController GET requests', () => {
  let mockRequest
  let mockH
  let consoleLogSpy

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined)

    mockRequest = {
      method: 'get',
      yar: {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(null)
      },
      payload: {},
      query: {},
      path: '/add_pollutant',
      headers: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('add-pollutant-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
  })

  it('pre-populates form from session without defaulting year', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      switch (key) {
        case 'selectedPollutants':
          return ['Nitrogen dioxide (NO2)', 'Particulate matter (PM10)']
        case 'selectedPollutantMode':
          return 'specific'
        case 'selectedPollutantGroup':
          return 'core'
        default:
          return null
      }
    })

    await airpollutantController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')

    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index',
      expect.objectContaining({
        pageTitle: 'Test Add Pollutant Page',
        heading: 'Test Heading',
        texts: ['Test text 1', 'Test text 2'],
        displayBacklink: true,
        hrefq: '/customdataset',
        selectedPollutants: [
          'Nitrogen dioxide (NO2)',
          'Particulate matter (PM10)'
        ],
        selectedMode: 'specific',
        selectedGroup: ''
      })
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

describe('airpollutantController POST validation errors', () => {
  let mockRequest
  let mockH
  let consoleLogSpy

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined)

    mockRequest = {
      method: 'post',
      yar: {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(null)
      },
      payload: {},
      query: {},
      path: '/add_pollutant',
      headers: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('add-pollutant-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
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
        errorMessage: { message: { text: 'Invalid pollutants data format.' } },
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

  it('handles empty pollutants array', async () => {
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
        errorMessage: { message: { text: 'Please add at least one pollutant' } }
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

describe('airpollutantController POST success scenarios', () => {
  let mockRequest
  let mockH
  let consoleLogSpy

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined)

    mockRequest = {
      method: 'post',
      yar: {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(null)
      },
      payload: {},
      query: {},
      path: '/add_pollutant',
      headers: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('add-pollutant-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
  })

  it('handles core group selection successfully', async () => {
    mockRequest.payload = {
      'pollutant-mode': 'group',
      'pollutant-group': 'core'
    }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
      'Particulate matter (PM2.5)',
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
      'Particulate matter (PM2.5)',
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

  it('clears prior selections when switching modes', async () => {
    mockRequest.yar.get.mockImplementation((key) => {
      if (key === 'selectedPollutantMode') return 'specific'
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

  it('uses no-JS template for POST when path contains nojs', async () => {
    mockRequest.payload = { 'pollutant-mode': 'specific' }
    mockRequest.path = '/add_pollutant/nojs'
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })

  it('uses no-JS template for POST when UA contains noscript', async () => {
    mockRequest.payload = { 'pollutant-mode': 'group' }
    mockRequest.headers = { 'user-agent': 'Mozilla/5.0 (compatible; noscript)' }
    await airpollutantController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenCalledWith(
      'add_pollutant/index_nojs',
      expect.any(Object)
    )
  })
})
