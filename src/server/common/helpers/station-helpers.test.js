import {
  fetchStationByLocation,
  fetchLast7DaysSummary,
  invokeTable,
  labelNoLegalLimit
} from './station-helpers.js'
import axios from 'axios'
import { config } from '~/src/config/config.js'
import { getJson } from '~/src/server/common/helpers/api-client.js'

jest.mock('axios')
jest.mock('~/src/server/common/helpers/api-client.js', () => ({
  getJson: jest.fn()
}))

describe('labelNoLegalLimit', () => {
  it("replaces 'n/a' daily and hourly counts with 'no legal limit'", () => {
    const rows = [
      { pollutantName: 'PM2.5', dailyCount: 'n/a', hourlyCount: 'n/a' },
      { pollutantName: 'PM10', dailyCount: '2', hourlyCount: 'n/a' },
      {
        pollutantName: 'Nitrogen dioxide',
        dailyCount: 'n/a',
        hourlyCount: '1'
      },
      { pollutantName: 'Ozone', dailyCount: 'n/a', hourlyCount: 'n/a' }
    ]

    expect(labelNoLegalLimit(rows)).toEqual([
      {
        pollutantName: 'PM2.5',
        dailyCount: 'no legal limit',
        hourlyCount: 'no legal limit'
      },
      {
        pollutantName: 'PM10',
        dailyCount: '2',
        hourlyCount: 'no legal limit'
      },
      {
        pollutantName: 'Nitrogen dioxide',
        dailyCount: 'no legal limit',
        hourlyCount: '1'
      },
      {
        pollutantName: 'Ozone',
        dailyCount: 'no legal limit',
        hourlyCount: 'no legal limit'
      }
    ])
  })

  it('keeps zero counts as they are', () => {
    const rows = [{ dailyCount: '0', hourlyCount: 0 }]

    expect(labelNoLegalLimit(rows)).toEqual(rows)
  })

  it('returns non-array data unchanged', () => {
    const error = new Error('boom')

    expect(labelNoLegalLimit(null)).toBeNull()
    expect(labelNoLegalLimit(error)).toBe(error)
    expect(labelNoLegalLimit({})).toEqual({})
  })
})

describe('invokeTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .spyOn(config, 'get')
      .mockImplementation((key) =>
        key === 'isDevelopment' ? false : 'http://table-api'
      )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("labels 'n/a' exceedance counts returned by the API", async () => {
    axios.post.mockResolvedValue({
      data: [{ pollutantName: 'Ozone', dailyCount: 'n/a', hourlyCount: 'n/a' }]
    })

    const result = await invokeTable({ siteId: 'ABC', year: '2023' })

    expect(axios.post).toHaveBeenCalledWith('http://table-api', {
      siteId: 'ABC',
      year: '2023'
    })
    expect(result).toEqual([
      {
        pollutantName: 'Ozone',
        dailyCount: 'no legal limit',
        hourlyCount: 'no legal limit'
      }
    ])
  })

  it('returns the error when the API call fails', async () => {
    const error = new Error('network')
    axios.post.mockRejectedValue(error)

    expect(await invokeTable({ siteId: 'ABC', year: '2023' })).toBe(error)
  })
})

describe('fetchStationByLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('requests the by-location endpoint with the given coordinates and name', async () => {
    getJson.mockResolvedValue({ station: { id: 'Sibton', name: 'Sibton' } })

    const result = await fetchStationByLocation({
      lat: '52.2944',
      lng: '1.463497',
      name: 'Sibton'
    })

    expect(getJson).toHaveBeenCalledWith({
      devUrlKey: 'osMonitoringStationDevUrl',
      urlKey: 'OS_NAMES_API_URL_1',
      path: 'by-location',
      params: { lat: '52.2944', lng: '1.463497', name: 'Sibton' },
      label: 'Station by location API'
    })
    expect(result).toEqual({ id: 'Sibton', name: 'Sibton' })
  })

  it('defaults name to an empty string when not provided', async () => {
    getJson.mockResolvedValue({ station: {} })

    await fetchStationByLocation({ lat: '52.2944', lng: '1.463497' })

    expect(getJson).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { lat: '52.2944', lng: '1.463497', name: '' }
      })
    )
  })

  it('returns null when the API returns no station', async () => {
    getJson.mockResolvedValue({ message: 'station not found' })

    const result = await fetchStationByLocation({
      lat: '52.2944',
      lng: '1.463497'
    })

    expect(result).toBeNull()
  })

  it('returns null when the API call fails', async () => {
    getJson.mockResolvedValue(null)

    const result = await fetchStationByLocation({
      lat: '52.2944',
      lng: '1.463497'
    })

    expect(result).toBeNull()
  })
})

describe('fetchLast7DaysSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('requests the monitoring station history endpoint for the given siteId', async () => {
    const history = {
      from: '2026-08-19T00:00:00.000Z',
      to: '2026-08-25T23:00:00.000Z',
      pollutants: {}
    }
    getJson.mockResolvedValue(history)

    const result = await fetchLast7DaysSummary({ siteId: 'UKA00315' })

    expect(getJson).toHaveBeenCalledWith({
      devUrlKey: 'monitoringStationHistoryDevUrl',
      urlKey: 'monitoringStationHistoryUrl',
      path: '',
      params: { siteId: 'UKA00315', period: '7d' },
      label: 'Monitoring station history API'
    })
    expect(result).toEqual(history)
  })

  it('returns null when the API call fails', async () => {
    getJson.mockResolvedValue(null)

    const result = await fetchLast7DaysSummary({ siteId: 'UKA00315' })

    expect(result).toBeNull()
  })
})
