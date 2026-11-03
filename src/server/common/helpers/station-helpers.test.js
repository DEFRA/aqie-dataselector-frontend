import {
  fetchStationByLocation,
  fetchStationHistory,
  resolveStationHistory
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

describe('fetchStationHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(['24h', '7d'])(
    'requests the monitoring station history endpoint for the given siteId and the %s period',
    async (period) => {
      const history = {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-25T23:00:00.000Z',
        pollutants: {}
      }
      getJson.mockResolvedValue(history)

      const result = await fetchStationHistory({ siteId: 'UKA00315', period })

      expect(getJson).toHaveBeenCalledWith({
        devUrlKey: 'monitoringStationHistoryDevUrl',
        urlKey: 'monitoringStationHistoryUrl',
        path: '',
        params: { siteId: 'UKA00315', period },
        label: 'Monitoring station history API'
      })
      expect(result).toEqual(history)
    }
  )

  it('returns null when the API call fails', async () => {
    getJson.mockResolvedValue(null)

    const result = await fetchStationHistory({
      siteId: 'UKA00315',
      period: '7d'
    })

    expect(result).toBeNull()
  })
})

describe('resolveStationHistory', () => {
  const station = {
    siteId: 'UKA00315',
    pollutants: ['PM2.5', 'Nitrogen dioxide']
  }
  const history = {
    from: '2026-10-20T01:00:00.000Z',
    to: '2026-10-27T00:00:00.000Z',
    pollutants: {},
    summary: {
      daqiIndex: 2,
      pollutants: {
        PM25: {
          periodAverage: 8.4,
          dataCapture: { capturePercentage: 100, isLowDataCapture: false },
          dailyExceedances: null,
          hourlyExceedances: null
        }
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('summarises the history for the pollutants the station measures', async () => {
    getJson.mockResolvedValue(history)

    const result = await resolveStationHistory(station, '7d')

    expect(result).toEqual({
      periodStart: '2026-10-20T00:00:00.000Z',
      periodEnd: '2026-10-26T23:00:00.000Z',
      latestReadingAt: '2026-10-27T00:00:00.000Z',
      pollutants: [
        {
          pollutantName: 'PM2.5',
          dataCapturePercentage: 100,
          lowDataCapture: false,
          average: 8,
          dailyCount: 'no legal limit',
          hourlyCount: 'no legal limit'
        }
      ],
      history
    })
  })

  it.each(['24h', '7d'])(
    'asks for the %s period using the station siteId',
    async (period) => {
      getJson.mockResolvedValue(history)

      await resolveStationHistory(station, period)

      expect(getJson).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { siteId: 'UKA00315', period }
        })
      )
    }
  )

  it('marks a station with no AURN siteId as having no mapping, without calling the API', async () => {
    const result = await resolveStationHistory({ pollutants: [] }, '7d')

    expect(result).toEqual({ noMapping: true })
    expect(getJson).not.toHaveBeenCalled()
  })

  it('returns an empty object when the API call fails', async () => {
    getJson.mockResolvedValue(null)

    const result = await resolveStationHistory(station, '7d')

    expect(result).toEqual({})
  })
})
