import { invokeStationCount } from '~/src/server/customdataset/station-count.js'
import { handleStationCountCalculation } from '~/src/server/customdataset/station-count-workflow.js'

jest.mock('~/src/server/customdataset/station-count.js', () => ({
  ...jest.requireActual('~/src/server/customdataset/station-count.js'),
  invokeStationCount: jest.fn()
}))
jest.mock('~/src/config/config.js', () => ({
  config: { get: jest.fn() }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })
}))

const AURN_GROUP = {
  category: 'Near real-time data from Defra',
  networks: [
    {
      name: 'AURN',
      fullName: 'Automatic Urban and Rural Network',
      abbreviation: 'aurn',
      pollutantID: 'p1'
    },
    { name: 'Hydrocarbon Network', pollutantID: 'p2' }
  ]
}
const OTHER_GROUP = {
  category: 'Other data from Defra',
  networks: [{ name: 'UKEAP', id: 'u1', pollutantID: 'p9' }]
}

// Request with a session backed by a plain object
function makeRequest(overrides = {}) {
  const session = {
    selectedyear: '2022',
    selectedpollutant: ['Ozone (O3)', 'Unmapped pollutant'],
    selectedPollutantID: 'p1',
    selectedlocation: ['England'],
    Location: 'Country',
    datasourceGroups: [AURN_GROUP, OTHER_GROUP],
    ...overrides
  }
  return {
    session,
    yar: {
      get: jest.fn((key) => session[key]),
      set: jest.fn((key, value) => {
        session[key] = value
      })
    }
  }
}

// Route invokeStationCount responses by data source / pollutant
function mockCounts({ aurn = 10, nonAurn = [], perPollutant = {} } = {}) {
  invokeStationCount.mockImplementation((params) => {
    if (params.dataSource === 'NON-AURN') {
      return Promise.resolve(nonAurn)
    }
    if (params.pollutantName in perPollutant) {
      return Promise.resolve(perPollutant[params.pollutantName])
    }
    return Promise.resolve(aurn)
  })
}

describe('handleStationCountCalculation', () => {
  it('stores formatted pollutants, year and counts for a country selection', async () => {
    mockCounts({
      aurn: 10,
      nonAurn: [{ networkType: 'UKEAP', count: 3 }]
    })
    const request = makeRequest()

    await expect(handleStationCountCalculation(request)).resolves.toBeNull()

    expect(request.session).toMatchObject({
      formattedPollutants: 'Ozone,Unmapped pollutant',
      finalyear1: '2022',
      stationCountError: false,
      Region: 'England',
      stationCountAURN: 10,
      nooflocation: 10,
      nooflocationukeap: [
        { networkType: 'UKEAP', id: 'u1', pollutantID: 'p9', count: 3 }
      ]
    })
    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSource: 'AURN',
        Region: 'England',
        regiontype: 'Country',
        networkId: ''
      })
    )
    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({ dataSource: 'NON-AURN', networkId: 'u1' })
    )
  })

  it('records a count for each near real-time network', async () => {
    mockCounts({ perPollutant: { p1: 5, p2: new Error('down') } })
    const request = makeRequest()

    await handleStationCountCalculation(request)

    expect(request.session.nearRealtimeStationCounts).toEqual([
      { name: 'AURN', pollutantID: 'p1', isAurn: true, count: 5 },
      {
        name: 'Hydrocarbon Network',
        pollutantID: 'p2',
        isAurn: false,
        count: 0
      }
    ])
  })

  it('skips duplicate and incomplete near real-time networks', async () => {
    mockCounts()
    const request = makeRequest({
      datasourceGroups: [
        {
          category: 'Near real-time data from Defra',
          networks: [
            'Automatic Urban and Rural Network',
            { name: 'A', pollutantID: 'p1' },
            { fullName: 'A', pollutantID: 'p1' },
            { name: 'NoPollutant' },
            null
          ]
        }
      ]
    })

    await handleStationCountCalculation(request)

    expect(request.session.nearRealtimeStationCounts).toEqual([
      { name: 'A', pollutantID: 'p1', isAurn: false, count: 10 }
    ])
  })

  it('builds zone parameters and drops NON-AURN networks', async () => {
    mockCounts({ nonAurn: [{ networkType: 'UKEAP', count: 3 }] })
    const request = makeRequest({ Location: 'Zone', selectedZoneIDs: 'z1,z2' })

    await handleStationCountCalculation(request)

    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSource: 'AURN',
        RegionId: 'z1,z2',
        Region: '',
        regiontype: 'Region'
      })
    )
    expect(request.session.nooflocationukeap).toEqual([])
  })

  it('builds agglomeration parameters', async () => {
    mockCounts()
    const request = makeRequest({
      Location: 'Agglomeration',
      selectedAgglomerationIDs: 'a1'
    })

    await handleStationCountCalculation(request)

    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        AgglomerationID: 'a1',
        RegionId: '',
        regiontype: 'Agglomeration'
      })
    )
  })

  it('defaults missing zone and agglomeration IDs to empty strings', async () => {
    mockCounts()
    const zone = makeRequest({ Location: 'Zone' })
    const agglomeration = makeRequest({ Location: 'Agglomeration' })

    await handleStationCountCalculation(zone)
    await handleStationCountCalculation(agglomeration)

    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({ regiontype: 'Region', RegionId: '' })
    )
    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        regiontype: 'Agglomeration',
        AgglomerationID: ''
      })
    )
  })

  it('builds local authority parameters', async () => {
    mockCounts()
    const request = makeRequest({
      Location: 'LocalAuthority',
      selectedLAIDs: '101,102',
      selectedDatasourceType: 'NON-AURN'
    })

    await handleStationCountCalculation(request)

    expect(invokeStationCount).toHaveBeenCalledWith(
      expect.objectContaining({
        Region: '101,102',
        regiontype: 'LocalAuthority'
      })
    )
  })

  it('does not call the API for data sources that were not selected', async () => {
    mockCounts()
    const request = makeRequest({ datasourceGroups: undefined })

    const result = await handleStationCountCalculation(request)

    expect(invokeStationCount).not.toHaveBeenCalled()
    expect(result).toEqual({ bothZero: true })
    expect(request.session.nooflocation).toBe(0)
  })

  it('returns bothZero when AURN and NON-AURN counts are both zero', async () => {
    mockCounts({ aurn: 0, nonAurn: [{ networkType: 'UKEAP', count: 0 }] })

    await expect(handleStationCountCalculation(makeRequest())).resolves.toEqual(
      { bothZero: true }
    )
  })

  it('falls back to per-pollutant counts when the combined AURN count is zero', async () => {
    mockCounts({ aurn: 0, perPollutant: { p1: 4, p2: [{ Count: '3' }] } })
    const request = makeRequest({
      selectedPollutantID: 'p1, p2,p1,',
      datasourceGroups: [{ category: 'Near real-time data from Defra' }]
    })

    await handleStationCountCalculation(request)

    expect(request.session.nooflocation).toBe(7)
  })

  it('keeps zero when the per-pollutant fallback also finds nothing', async () => {
    mockCounts({ aurn: 0, perPollutant: { p1: 0, p2: new Error('x') } })
    const request = makeRequest({ selectedPollutantID: 'p1,p2' })

    await handleStationCountCalculation(request)

    expect(request.session.nooflocation).toBe(0)
  })

  it('uses the per-pollutant fallback when the combined AURN call fails', async () => {
    mockCounts({
      aurn: new Error('combined failed'),
      perPollutant: { p1: 2, p2: 6 }
    })
    const request = makeRequest({ selectedPollutantID: 'p1,p2' })

    await expect(handleStationCountCalculation(request)).resolves.toBeNull()

    expect(request.session.stationCountError).toBe(false)
    expect(request.session.nooflocation).toBe(8)
  })

  it('flags the count as unavailable when AURN fails and there is no fallback', async () => {
    mockCounts({ aurn: new Error('down') })
    const request = makeRequest()

    await expect(handleStationCountCalculation(request)).resolves.toBeNull()

    expect(request.session.stationCountError).toBe(true)
    expect(request.session.nooflocation).toBeNull()
  })

  it('flags the count as unavailable when AURN returns nothing', async () => {
    mockCounts({ aurn: null })
    const request = makeRequest({ selectedPollutantID: undefined })

    await handleStationCountCalculation(request)

    expect(request.session.stationCountError).toBe(true)
  })
})
