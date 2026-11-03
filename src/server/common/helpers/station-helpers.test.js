import {
  fetchStationByLocation,
  fetchLast7DaysSummary
} from './station-helpers.js'
import { getJson } from '~/src/server/common/helpers/api-client.js'

jest.mock('~/src/server/common/helpers/api-client.js', () => ({
  getJson: jest.fn()
}))

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
