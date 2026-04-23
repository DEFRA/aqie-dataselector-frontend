import axios from 'axios'
import Wreck from '@hapi/wreck'
import {
  datasourceController,
  fetchDatasourceForPollutant,
  groupDatasources
} from './controller.js'

import { config } from '~/src/config/config.js'
import { invokeStationCount } from '~/src/server/customdataset/controller.js'

jest.mock('axios')
jest.mock('@hapi/wreck')

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Data Source Page',
      heading: 'Test Data Source Heading',
      texts: { testKey: 'testValue' }
    }
  }
}))

jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))

jest.mock('~/src/server/data/en/networks.js', () => ({
  networkData: {
    AURN: {
      name: 'AURN',
      fullName: 'Automatic Urban and Rural Network',
      abbreviation: 'AURN',
      category: 'Near real-time data from Defra'
    },
    SAQN: {
      name: 'SAQN',
      fullName: 'Scottish Air Quality Network',
      abbreviation: 'SAQN',
      category: 'Near real-time data from Defra'
    },
    UKEAP: {
      name: 'UKEAP',
      fullName: 'UK Eutrophying and Acidifying Pollutants Network',
      abbreviation: 'UKEAP',
      category: 'Other data from Defra'
    }
  }
}))

jest.mock('~/src/server/customdataset/controller.js', () => ({
  invokeStationCount: jest.fn()
}))

const makeRequest = (overrides = {}) => ({
  method: 'get',
  yar: {
    set: jest.fn(),
    get: jest.fn().mockReturnValue(null)
  },
  payload: null,
  ...overrides
})

const makeH = () => ({
  view: jest.fn().mockReturnValue('view-response'),
  redirect: jest.fn().mockReturnValue('redirect-response')
})

describe('groupDatasources', () => {
  it('returns empty array for empty input', () => {
    expect(groupDatasources([])).toEqual([])
  })

  it('groups networks under known category headers', () => {
    const flat = [
      'Near real-time data from Defra',
      'AURN',
      'SAQN',
      'Other data from Defra',
      'UKEAP'
    ]
    expect(groupDatasources(flat)).toEqual([
      {
        category: 'Near real-time data from Defra',
        networks: ['AURN', 'SAQN']
      },
      { category: 'Other data from Defra', networks: ['UKEAP'] }
    ])
  })

  it('ignores items before the first known category', () => {
    const flat = ['RandomItem', 'Near real-time data from Defra', 'AURN']
    expect(groupDatasources(flat)).toEqual([
      { category: 'Near real-time data from Defra', networks: ['AURN'] }
    ])
  })

  it('treats unrecognised strings as network items within current group', () => {
    const flat = [
      'Near real-time data from Defra',
      'AURN',
      'SomeUnknownNetwork',
      'SAQN'
    ]
    expect(groupDatasources(flat)).toEqual([
      {
        category: 'Near real-time data from Defra',
        networks: ['AURN', 'SomeUnknownNetwork', 'SAQN']
      }
    ])
  })

  it('handles consecutive category headers with no networks', () => {
    const flat = ['Near real-time data from Defra', 'Other data from Defra']
    expect(groupDatasources(flat)).toEqual([
      { category: 'Near real-time data from Defra', networks: [] },
      { category: 'Other data from Defra', networks: [] }
    ])
  })

  it('handles single category with multiple networks', () => {
    const flat = ['Near real-time data from Defra', 'A', 'B', 'C']
    expect(groupDatasources(flat)).toEqual([
      { category: 'Near real-time data from Defra', networks: ['A', 'B', 'C'] }
    ])
  })
})

describe('fetchDatasourceForPollutant', () => {
  const prodUrl = 'https://api.example.com/datasource'
  const devUrl = 'https://dev.api.example.com/datasource'
  const devApiKey = 'test-api-key'

  beforeEach(() => {
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      if (key === 'datasourceApiUrl') return prodUrl
      if (key === 'datasourceDevUrl') return devUrl
      if (key === 'osNamesDevApiKey') return devApiKey
      return null
    })
  })

  describe('production mode', () => {
    it('calls axios.post and returns array from response.data', async () => {
      axios.post.mockResolvedValue({
        data: ['Near real-time data from Defra', 'AURN']
      })
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(axios.post).toHaveBeenCalledWith(prodUrl, {
        pollutantID: 'pm25-id'
      })
      expect(result).toEqual(['Near real-time data from Defra', 'AURN'])
    })

    it('returns empty array when response.data is not an array', async () => {
      axios.post.mockResolvedValue({ data: { some: 'object' } })
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(result).toEqual([])
    })

    it('returns null when axios throws', async () => {
      axios.post.mockRejectedValue(new Error('Network error'))
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(result).toBeNull()
    })

    it('coerces non-string pollutantID to string', async () => {
      axios.post.mockResolvedValue({ data: [] })
      await fetchDatasourceForPollutant(42)
      expect(axios.post).toHaveBeenCalledWith(prodUrl, { pollutantID: '42' })
    })

    it('returns empty array when response.data is null', async () => {
      axios.post.mockResolvedValue({ data: null })
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(result).toEqual([])
    })
  })

  describe('development mode', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) => {
        if (key === 'isDevelopment') return true
        if (key === 'datasourceDevUrl') return devUrl
        if (key === 'osNamesDevApiKey') return devApiKey
        return null
      })
    })

    it('uses Wreck.post in dev mode and returns array payload', async () => {
      Wreck.post.mockResolvedValue({
        payload: ['Near real-time data from Defra', 'AURN']
      })
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(Wreck.post).toHaveBeenCalledWith(
        devUrl,
        expect.objectContaining({
          payload: JSON.stringify({ pollutantID: 'pm25-id' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': devApiKey
          }),
          json: true
        })
      )
      expect(result).toEqual(['Near real-time data from Defra', 'AURN'])
    })

    it('returns empty array when Wreck payload is not an array', async () => {
      Wreck.post.mockResolvedValue({ payload: null })
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(result).toEqual([])
    })

    it('returns null when Wreck throws', async () => {
      Wreck.post.mockRejectedValue(new Error('Wreck error'))
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(result).toBeNull()
    })

    it('returns empty array when Wreck payload is a plain object', async () => {
      Wreck.post.mockResolvedValue({ payload: { unexpected: true } })
      const result = await fetchDatasourceForPollutant('pm25-id')
      expect(result).toEqual([])
    })
  })
})

describe('datasourceController GET handler', () => {
  let request, h

  beforeEach(() => {
    request = makeRequest()
    h = makeH()
    config.get.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      if (key === 'datasourceApiUrl')
        return 'https://api.example.com/datasource'
      return null
    })
  })

  it('renders datasource/index with enriched groups from session', async () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups')
        return [
          {
            category: 'Near real-time data from Defra',
            networks: ['AURN']
          }
        ]
      return null
    })
    const result = await datasourceController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({
        pageTitle: 'Test Data Source Page',
        heading: 'Test Data Source Heading',
        displayBacklink: true,
        hrefq: '/customdataset',
        datasourceGroups: expect.any(Array),
        otherGroups: expect.any(Array)
      })
    )
    expect(result).toBe('view-response')
  })

  it('enriches AURN network entry using networkData lookup', async () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups')
        return [
          { category: 'Near real-time data from Defra', networks: ['AURN'] }
        ]
      return null
    })
    await datasourceController.handler(request, h)
    const { datasourceGroups } = h.view.mock.calls[0][1]
    expect(datasourceGroups[0].networks[0]).toMatchObject({
      name: 'AURN',
      fullName: 'Automatic Urban and Rural Network',
      abbreviation: 'AURN'
    })
  })

  it('puts non-used networks into otherGroups', async () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups')
        return [
          { category: 'Near real-time data from Defra', networks: ['AURN'] }
        ]
      return null
    })
    await datasourceController.handler(request, h)
    const { otherGroups } = h.view.mock.calls[0][1]
    const allOtherAbbreviations = otherGroups.flatMap((g) =>
      g.networks.map((n) => n.abbreviation)
    )
    // SAQN and UKEAP not in session groups → appear in otherGroups
    expect(allOtherAbbreviations).toContain('SAQN')
    expect(allOtherAbbreviations).toContain('UKEAP')
  })

  it('falls back to an inline stub when network not found in networkData', async () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups')
        return [
          {
            category: 'Near real-time data from Defra',
            networks: ['UNKNOWN_NET']
          }
        ]
      return null
    })
    await datasourceController.handler(request, h)
    const { datasourceGroups } = h.view.mock.calls[0][1]
    expect(datasourceGroups[0].networks[0]).toMatchObject({
      name: 'UNKNOWN_NET',
      fullName: 'UNKNOWN_NET'
    })
  })

  it('fetches datasource from API when session groups is empty and pollutantID present', async () => {
    axios.post.mockResolvedValue({
      data: ['Near real-time data from Defra', 'AURN']
    })
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups') return []
      if (key === 'selectedPollutantID') return '40'
      return null
    })
    await datasourceController.handler(request, h)
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.example.com/datasource',
      { pollutantID: '40' }
    )
    expect(request.yar.set).toHaveBeenCalledWith('datasourceGroups', [
      { category: 'Near real-time data from Defra', networks: ['AURN'] }
    ])
    expect(h.view).toHaveBeenCalled()
  })

  it('fetches datasource using comma-separated IDs when a group is selected', async () => {
    axios.post.mockResolvedValue({
      data: [
        'Near real-time data from Defra',
        'AURN',
        'Other data from Defra',
        'UKEAP'
      ]
    })
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups') return []
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      return null
    })
    await datasourceController.handler(request, h)
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.example.com/datasource',
      { pollutantID: '40,39,44,37,38' }
    )
    expect(h.view).toHaveBeenCalled()
  })

  it('redirects to problem-with-service when API fetch returns null', async () => {
    axios.post.mockRejectedValue(new Error('API error'))
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups') return []
      if (key === 'selectedPollutantID') return '40'
      return null
    })
    const result = await datasourceController.handler(request, h)
    expect(h.redirect).toHaveBeenCalledWith(
      '/problem-with-service?statusCode=500'
    )
    expect(result).toBe('redirect-response')
    expect(h.view).not.toHaveBeenCalled()
  })

  it('skips fetch and renders when session groups is empty but no pollutantID', async () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups') return []
      return null
    })
    await datasourceController.handler(request, h)
    expect(axios.post).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({ datasourceGroups: [] })
    )
  })

  it('defaults datasourceGroups to [] when session returns null', async () => {
    request.yar.get.mockReturnValue(null)
    await datasourceController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({ datasourceGroups: [] })
    )
  })

  it('renders with empty enriched groups when API returns empty flat array', async () => {
    axios.post.mockResolvedValue({ data: [] })
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups') return []
      if (key === 'selectedPollutantID') return 'pm25-id'
      return null
    })
    await datasourceController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({ datasourceGroups: [] })
    )
  })

  it('does not call fetch when session already has groups', async () => {
    request.yar.get.mockImplementation((key) => {
      if (key === 'datasourceGroups')
        return [
          { category: 'Near real-time data from Defra', networks: ['AURN'] }
        ]
      return null
    })
    await datasourceController.handler(request, h)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('sets displayBacklink true and hrefq to /customdataset', async () => {
    request.yar.get.mockReturnValue(null)
    await datasourceController.handler(request, h)
    expect(h.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    )
  })
})

describe('datasourceController POST handler', () => {
  let request, h

  beforeEach(() => {
    invokeStationCount.mockResolvedValue(10)
    request = makeRequest({ method: 'post', payload: {} })
    h = makeH()
  })

  it('sets selectedDatasourceType from payload and redirects to /customdataset', async () => {
    request.payload = { 'datasource-type': 'NON-AURN' }
    request.yar.get.mockReturnValue(null)
    const result = await datasourceController.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith(
      'selectedDatasourceType',
      'NON-AURN'
    )
    expect(h.redirect).toHaveBeenCalledWith('/customdataset')
    expect(result).toBe('redirect-response')
  })

  it('defaults selectedDatasourceType to AURN when payload has no datasource-type', async () => {
    request.payload = {}
    request.yar.get.mockReturnValue(null)
    await datasourceController.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith(
      'selectedDatasourceType',
      'AURN'
    )
  })

  it('defaults to AURN when payload is null', async () => {
    request.payload = null
    request.yar.get.mockReturnValue(null)
    await datasourceController.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith(
      'selectedDatasourceType',
      'AURN'
    )
  })

  it('calls invokeStationCount twice when all required session data is present', async () => {
    request.payload = { 'datasource-type': 'AURN' }
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['England']
      if (key === 'Location') return 'Country'
      return null
    })
    invokeStationCount.mockResolvedValueOnce(15).mockResolvedValueOnce(5)
    await datasourceController.handler(request, h)
    expect(invokeStationCount).toHaveBeenCalledTimes(2)
    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({ dataSource: 'AURN' })
    )
    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({ dataSource: 'NON-AURN' })
    )
  })

  it('sets stationCountAURN, stationCountNONAURN, nooflocationukeap after station count', async () => {
    request.payload = { 'datasource-type': 'AURN' }
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['England']
      if (key === 'Location') return 'Country'
      return null
    })
    invokeStationCount.mockResolvedValueOnce(15).mockResolvedValueOnce(5)
    await datasourceController.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('stationCountAURN', 15)
    expect(request.yar.set).toHaveBeenCalledWith('stationCountNONAURN', 5)
    expect(request.yar.set).toHaveBeenCalledWith('nooflocationukeap', 5)
  })

  it('sets nooflocation to aurnCount when datasourceType is AURN', async () => {
    request.payload = { 'datasource-type': 'AURN' }
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['England']
      if (key === 'Location') return 'Country'
      return null
    })
    invokeStationCount.mockResolvedValueOnce(15).mockResolvedValueOnce(5)
    await datasourceController.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('nooflocation', 15)
  })

  it('sets nooflocation to nonAurnCount when datasourceType is NON-AURN', async () => {
    request.payload = { 'datasource-type': 'NON-AURN' }
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['England']
      if (key === 'Location') return 'Country'
      return null
    })
    invokeStationCount.mockResolvedValueOnce(15).mockResolvedValueOnce(5)
    await datasourceController.handler(request, h)
    expect(request.yar.set).toHaveBeenCalledWith('nooflocation', 5)
  })

  it('builds Country region params with joined selectedlocation', async () => {
    request.payload = { 'datasource-type': 'AURN' }
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['England', 'Wales']
      if (key === 'Location') return 'Country'
      return null
    })
    invokeStationCount.mockResolvedValue(10)
    await datasourceController.handler(request, h)
    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        pollutantName: '40,39,44,37,38',
        Region: 'England,Wales',
        regiontype: 'Country',
        Year: '2023',
        dataselectorfiltertype: 'dataSelectorCount',
        dataselectordownloadtype: ''
      })
    )
  })

  it('builds LocalAuthority region params using selectedLAIDs', async () => {
    request.payload = { 'datasource-type': 'AURN' }
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['London']
      if (key === 'Location') return 'LocalAuthority'
      if (key === 'selectedLAIDs') return 'LA1,LA2'
      return null
    })
    invokeStationCount.mockResolvedValue(10)
    await datasourceController.handler(request, h)
    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        Region: 'LA1,LA2',
        regiontype: 'LocalAuthority'
      })
    )
  })

  it('skips station count when finalyear1 is missing', async () => {
    request.payload = {}
    request.yar.get.mockImplementation((key) => {
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['England']
      return null
    })
    await datasourceController.handler(request, h)
    expect(invokeStationCount).not.toHaveBeenCalled()
    expect(h.redirect).toHaveBeenCalledWith('/customdataset')
  })

  it('skips station count when selectedPollutantID is missing', async () => {
    request.payload = {}
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedlocation') return ['England']
      return null
    })
    await datasourceController.handler(request, h)
    expect(invokeStationCount).not.toHaveBeenCalled()
  })

  it('skips station count when selectedlocation is missing', async () => {
    request.payload = {}
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      return null
    })
    await datasourceController.handler(request, h)
    expect(invokeStationCount).not.toHaveBeenCalled()
  })

  it('still redirects to /customdataset when invokeStationCount throws', async () => {
    request.payload = { 'datasource-type': 'AURN' }
    request.yar.get.mockImplementation((key) => {
      if (key === 'finalyear1') return '2023'
      if (key === 'selectedPollutantID') return '40,39,44,37,38'
      if (key === 'selectedlocation') return ['England']
      if (key === 'Location') return 'Country'
      return null
    })
    invokeStationCount.mockRejectedValue(new Error('Station count error'))
    const result = await datasourceController.handler(request, h)
    expect(h.redirect).toHaveBeenCalledWith('/customdataset')
    expect(result).toBe('redirect-response')
  })

  it('always redirects to /customdataset after POST regardless of session state', async () => {
    request.payload = {}
    request.yar.get.mockReturnValue(null)
    const result = await datasourceController.handler(request, h)
    expect(h.redirect).toHaveBeenCalledWith('/customdataset')
    expect(result).toBe('redirect-response')
    expect(h.view).not.toHaveBeenCalled()
  })
})
