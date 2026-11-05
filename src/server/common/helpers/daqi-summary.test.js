import { summariseDaqiHistory } from './daqi-summary.js'

function daqiSummaryFor(overrides = {}) {
  return {
    daqi: {
      concentration: 12.4,
      index: 2,
      measuredAt: '2026-10-30T11:00:00.000Z',
      averagingPeriod: '24-hour mean',
      ...overrides
    }
  }
}

function history(pollutantSummaries, extra = {}) {
  return {
    from: '2026-10-29T12:00:00.000Z',
    to: '2026-10-30T11:00:00.000Z',
    pollutants: {},
    summary: {
      daqiIndex: 4,
      measuredAt: '2026-10-30T11:00:00.000Z',
      pollutants: pollutantSummaries
    },
    ...extra
  }
}

describe('summariseDaqiHistory', () => {
  it('maps each monitored pollutant to its DAQI average, index, band and averaging period', () => {
    const result = summariseDaqiHistory(
      history({
        PM25: daqiSummaryFor({ concentration: 11.6, index: 2 }),
        PM10: daqiSummaryFor({ concentration: 18.1, index: 2 }),
        NO2: daqiSummaryFor({ concentration: 201.3, index: 4 }),
        O3: daqiSummaryFor({ concentration: 41.2, index: 2 }),
        SO2: daqiSummaryFor({ concentration: 500, index: 7 })
      }),
      ['PM2.5', 'PM10', 'Nitrogen dioxide', 'Ozone', 'Sulphur dioxide']
    )

    expect(result.measuredAt).toBe('2026-10-30T11:00:00.000Z')
    expect(result.latestReadingAt).toBe('2026-10-30T11:00:00.000Z')
    expect(result.pollutants).toEqual([
      {
        pollutantName: 'PM2.5',
        average: 12,
        daqiIndex: 2,
        daqiBand: 'low',
        averagingPeriod: '24 hour average'
      },
      {
        pollutantName: 'PM10',
        average: 18,
        daqiIndex: 2,
        daqiBand: 'low',
        averagingPeriod: '24 hour average'
      },
      {
        pollutantName: 'Nitrogen dioxide',
        average: 201,
        daqiIndex: 4,
        daqiBand: 'moderate',
        averagingPeriod: 'Hourly average'
      },
      {
        pollutantName: 'Ozone',
        average: 41,
        daqiIndex: 2,
        daqiBand: 'low',
        averagingPeriod: '8 hour rolling average'
      },
      {
        pollutantName: 'Sulphur dioxide',
        average: 500,
        daqiIndex: 7,
        daqiBand: 'high',
        averagingPeriod: '15 minute concentrations'
      }
    ])
  })

  it.each([
    [1, 'low'],
    [2, 'low'],
    [3, 'low'],
    [4, 'moderate'],
    [5, 'moderate'],
    [6, 'moderate'],
    [7, 'high'],
    [8, 'high'],
    [9, 'high'],
    [10, 'very high']
  ])('maps DAQI index %i to band %s', (index, expectedBand) => {
    const result = summariseDaqiHistory(
      history({ PM25: daqiSummaryFor({ index }) }),
      ['PM2.5']
    )

    expect(result.pollutants[0].daqiBand).toBe(expectedBand)
  })

  it("shows '-' when a pollutant has no DAQI reading", () => {
    const result = summariseDaqiHistory(history({ PM25: { daqi: null } }), [
      'PM2.5'
    ])

    expect(result.pollutants[0]).toEqual({
      pollutantName: 'PM2.5',
      average: '-',
      daqiIndex: null,
      daqiBand: null,
      averagingPeriod: '24 hour average'
    })
  })

  it('filters and orders rows by stationPollutants', () => {
    const result = summariseDaqiHistory(
      history({
        PM25: daqiSummaryFor(),
        NO2: daqiSummaryFor(),
        O3: daqiSummaryFor()
      }),
      ['Ozone', 'PM2.5']
    )

    expect(result.pollutants.map((p) => p.pollutantName)).toEqual([
      'Ozone',
      'PM2.5'
    ])
  })

  it('falls back to code and backend averagingPeriod for unknown pollutants', () => {
    const result = summariseDaqiHistory(
      history({
        CO: daqiSummaryFor({
          concentration: 3,
          index: 99,
          averagingPeriod: '8-hour mean'
        })
      }),
      ['CO']
    )

    expect(result.pollutants[0]).toEqual({
      pollutantName: 'CO',
      average: 3,
      daqiIndex: 99,
      daqiBand: null,
      averagingPeriod: '8-hour mean'
    })
  })

  it('handles missing summary gracefully', () => {
    const result = summariseDaqiHistory({ to: null, pollutants: {} })

    expect(result).toEqual({
      measuredAt: null,
      periodDate: null,
      latestReadingAt: null,
      pollutants: []
    })
  })

  it('accepts a DAQI index sent as a string', () => {
    const result = summariseDaqiHistory(
      history({ PM25: daqiSummaryFor({ index: '4' }) }),
      ['PM2.5']
    )

    expect(result.pollutants[0].daqiBand).toBe('moderate')
  })

  it.each(['', null, 'high', 4.5])(
    'gives no band for the unusable index %p',
    (index) => {
      const result = summariseDaqiHistory(
        history({ PM25: daqiSummaryFor({ index }) }),
        ['PM2.5']
      )

      expect(result.pollutants[0].daqiBand).toBeNull()
    }
  )

  it('exposes periodDate as the start of the hour measuredAt ends, so midnight stamps stay on the previous day', () => {
    const result = summariseDaqiHistory(
      history(
        { PM25: daqiSummaryFor() },
        {
          summary: {
            measuredAt: '2026-10-31T00:00:00.000Z',
            pollutants: { PM25: daqiSummaryFor() }
          }
        }
      ),
      ['PM2.5']
    )

    expect(result.measuredAt).toBe('2026-10-31T00:00:00.000Z')
    expect(result.periodDate).toBe('2026-10-30T23:00:00.000Z')
  })
})
