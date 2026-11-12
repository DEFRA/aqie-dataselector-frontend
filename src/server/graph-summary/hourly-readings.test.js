import { config } from '~/src/config/config.js'
import { HISTORY_PERIOD } from '~/src/server/common/constants/history-period.js'
import { resolveStationHistory } from '~/src/server/common/helpers/station-helpers.js'
import { buildHourlyReadings } from '~/src/server/graph-summary/hourly-readings.js'

jest.mock('~/src/server/common/helpers/logging/logger-options.js', () => ({
  loggerOptions: { enabled: true, ignorePaths: [], redact: { paths: [] } }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({ warn: jest.fn() }))
}))
jest.mock('~/src/server/common/helpers/station-helpers.js')

const STATION = {
  id: 'a',
  siteId: 'UKA00315',
  pollutants: ['PM2.5', 'PM10']
}

const readings = {
  history: {
    pollutants: {
      PM25: [
        { time: '2026-11-03T10:00:00.000Z', value: 5.2 },
        { time: '2026-11-03T11:00:00.000Z', value: null }
      ],
      PM10: [{ time: '2026-11-03T10:00:00.000Z', value: 12.26 }]
    }
  }
}

const cells = (row) => row.map(({ text }) => text)

describe('buildHourlyReadings', () => {
  const flag = config.get('featureFlags.viewGraphSummary')

  beforeEach(() => {
    jest.clearAllMocks()
    config.set('featureFlags.viewGraphSummary', true)
    resolveStationHistory.mockResolvedValue(readings)
  })

  afterAll(() => {
    config.set('featureFlags.viewGraphSummary', flag)
  })

  it('has nothing, and fetches nothing, when the feature is off', async () => {
    config.set('featureFlags.viewGraphSummary', false)

    expect(await buildHourlyReadings(STATION)).toEqual([])
    expect(resolveStationHistory).not.toHaveBeenCalled()
  })

  it('fetches the history of both periods', async () => {
    await buildHourlyReadings(STATION)

    expect(resolveStationHistory).toHaveBeenCalledTimes(2)
    expect(resolveStationHistory).toHaveBeenCalledWith(
      STATION,
      HISTORY_PERIOD.LAST_24_HOURS
    )
    expect(resolveStationHistory).toHaveBeenCalledWith(
      STATION,
      HISTORY_PERIOD.LAST_7_DAYS
    )
  })

  it('has a section for each period, the last 24 hours first', async () => {
    const sections = await buildHourlyReadings(STATION)

    expect(sections.map(({ period, title }) => [period, title])).toEqual([
      ['last24hours', 'View hourly data for the last 24 hours'],
      ['last7days', 'View hourly data for the last 7 days']
    ])
  })

  it('captions each table with its period', async () => {
    const sections = await buildHourlyReadings(STATION)

    expect(sections.map(({ table }) => table.caption)).toEqual([
      'Hourly readings in µg/m³ for the last 24 hours',
      'Hourly readings in µg/m³ for the last 7 days'
    ])
  })

  it('has a column for each pollutant and a row for each hour, in UTC', async () => {
    const [{ table }] = await buildHourlyReadings(STATION)

    expect(cells(table.head)).toEqual(['Time (UTC)', 'PM2.5', 'PM10'])
    expect(table.rows.map(cells)).toEqual([
      ['3 Nov 2026, 10:00', '5.2', '12.3'],
      ['3 Nov 2026, 11:00', 'No data', 'No data']
    ])
  })

  it('carries the verification banner text for the readings', async () => {
    const sections = await buildHourlyReadings(STATION)

    sections.forEach(({ verificationBanner }) =>
      expect(verificationBanner).toBe('Data has not been checked and verified')
    )
  })

  it('leaves out a period whose call failed', async () => {
    resolveStationHistory.mockImplementation((_station, period) =>
      Promise.resolve(period === HISTORY_PERIOD.LAST_24_HOURS ? {} : readings)
    )

    const sections = await buildHourlyReadings(STATION)

    expect(sections.map(({ period }) => period)).toEqual(['last7days'])
  })

  it('has nothing for a station with no AURN site id', async () => {
    resolveStationHistory.mockResolvedValue({ noMapping: true })

    expect(await buildHourlyReadings(STATION)).toEqual([])
  })

  it('has nothing when none of the station pollutants have readings', async () => {
    const sections = await buildHourlyReadings({
      ...STATION,
      pollutants: ['Ozone']
    })

    expect(sections).toEqual([])
  })

  it('leaves out a period when its history cannot be read, rather than failing', async () => {
    resolveStationHistory.mockImplementation((_station, period) =>
      period === HISTORY_PERIOD.LAST_24_HOURS
        ? Promise.reject(new Error('bad response'))
        : Promise.resolve(readings)
    )

    const sections = await buildHourlyReadings(STATION)

    expect(sections.map(({ period }) => period)).toEqual(['last7days'])
  })
})
