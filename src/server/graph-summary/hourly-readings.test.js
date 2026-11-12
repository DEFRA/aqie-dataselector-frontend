import { config } from '~/src/config/config.js'
import { buildHourlyReadings } from '~/src/server/graph-summary/hourly-readings.js'

const POLLUTANTS = ['PM2.5', 'PM10']

const HISTORY = {
  pollutants: {
    PM25: [
      { time: '2026-11-03T10:00:00.000Z', value: 5.2 },
      { time: '2026-11-03T11:00:00.000Z', value: null }
    ],
    PM10: [{ time: '2026-11-03T10:00:00.000Z', value: 12.26 }]
  }
}

const cells = (row) => row.map(({ text }) => text)

describe('buildHourlyReadings', () => {
  const flag = config.get('featureFlags.viewGraphSummary')

  beforeEach(() => {
    config.set('featureFlags.viewGraphSummary', true)
  })

  afterAll(() => {
    config.set('featureFlags.viewGraphSummary', flag)
  })

  it('has nothing when the feature is off', () => {
    config.set('featureFlags.viewGraphSummary', false)

    expect(buildHourlyReadings(HISTORY, POLLUTANTS, 'last24hours')).toBeNull()
  })

  it.each([
    [
      'last24hours',
      'View hourly data for the last 24 hours',
      'Hourly readings in µg/m³ for the last 24 hours'
    ],
    [
      'last7days',
      'View hourly data for the last 7 days',
      'Hourly readings in µg/m³ for the last 7 days'
    ]
  ])('is titled and captioned for the %s period', (period, title, caption) => {
    const readings = buildHourlyReadings(HISTORY, POLLUTANTS, period)

    expect(readings.period).toBe(period)
    expect(readings.title).toBe(title)
    expect(readings.table.caption).toBe(caption)
  })

  it('has a column for each pollutant and a row for each hour, in UTC', () => {
    const { table } = buildHourlyReadings(HISTORY, POLLUTANTS, 'last24hours')

    expect(cells(table.head)).toEqual(['Time (UTC)', 'PM2.5', 'PM10'])
    expect(table.rows.map(cells)).toEqual([
      ['3 Nov 2026, 10:00', '5.2', '12.3'],
      ['3 Nov 2026, 11:00', 'No data', 'No data']
    ])
  })

  it('only has the pollutants the station measures', () => {
    const { table } = buildHourlyReadings(HISTORY, ['PM10'], 'last24hours')

    expect(cells(table.head)).toEqual(['Time (UTC)', 'PM10'])
  })

  it('carries the verification banner text for the readings', () => {
    const readings = buildHourlyReadings(HISTORY, POLLUTANTS, 'last7days')

    expect(readings.verificationBanner).toBe(
      'Data has not been checked and verified'
    )
  })

  it.each([
    ['there is no history', undefined, POLLUTANTS],
    ['the history has no pollutants', {}, POLLUTANTS],
    ['none of the station pollutants have readings', HISTORY, ['Ozone']],
    ['the station has no pollutants', HISTORY, undefined]
  ])('has nothing when %s', (_reason, history, pollutants) => {
    expect(buildHourlyReadings(history, pollutants, 'last24hours')).toBeNull()
  })
})
