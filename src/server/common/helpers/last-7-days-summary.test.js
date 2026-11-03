import { summariseStationHistory } from './last-7-days-summary.js'

const WINDOW = {
  from: '2026-08-19T01:00:00.000Z',
  to: '2026-08-26T00:00:00.000Z'
}

/** A back-end summary entry; override only what a test cares about. */
function summaryFor(overrides = {}) {
  return {
    periodAverage: 10,
    dataCapture: {
      validHours: 168,
      expectedHours: 168,
      capturePercentage: 100,
      isLowDataCapture: false
    },
    hourlyExceedances: null,
    dailyExceedances: null,
    ...overrides
  }
}

function history(pollutantSummaries, extra = {}) {
  return {
    ...WINDOW,
    pollutants: {},
    summary: { daqiIndex: 1, pollutants: pollutantSummaries },
    ...extra
  }
}

describe('summariseStationHistory', () => {
  it('labels the window with the first and last day it covers', () => {
    // Hour-ending stamps: 01:00 on 19 Aug to 00:00 on 26 Aug covers 19-25 Aug.
    const result = summariseStationHistory(history({}), [])

    expect(result.periodStart).toBe('2026-08-19T00:00:00.000Z')
    expect(result.periodEnd).toBe('2026-08-25T23:00:00.000Z')
    expect(result.latestReadingAt).toBe('2026-08-26T00:00:00.000Z')
  })

  it('leaves the window empty when the back end has no readings', () => {
    const result = summariseStationHistory(
      { from: null, to: null, pollutants: {}, summary: { pollutants: {} } },
      []
    )

    expect(result.periodStart).toBeNull()
    expect(result.periodEnd).toBeNull()
  })

  it('only includes pollutants the station monitors, in that order', () => {
    const result = summariseStationHistory(
      history({
        PM25: summaryFor(),
        PM10: summaryFor(),
        NO2: summaryFor()
      }),
      ['Nitrogen dioxide', 'PM2.5']
    )

    expect(result.pollutants.map((p) => p.pollutantName)).toEqual([
      'Nitrogen dioxide',
      'PM2.5'
    ])
  })

  it('uses the back-end data capture percentage as given', () => {
    const result = summariseStationHistory(
      history({
        PM25: summaryFor({
          dataCapture: {
            validHours: 160,
            expectedHours: 168,
            capturePercentage: 95
          }
        })
      }),
      ['PM2.5']
    )

    expect(result.pollutants[0].dataCapturePercentage).toBe(95)
  })

  describe('average', () => {
    it.each([
      [8.4, 8],
      [8.5, 9],
      [0.4, 0],
      [67.49, 67]
    ])(
      'rounds the unrounded back-end average %s to %s for display',
      (periodAverage, expected) => {
        const result = summariseStationHistory(
          history({ PM25: summaryFor({ periodAverage }) }),
          ['PM2.5']
        )

        expect(result.pollutants[0].average).toBe(expected)
      }
    )

    it("shows '-' and flags low data capture when the back end withheld the average", () => {
      const result = summariseStationHistory(
        history({
          PM25: summaryFor({
            periodAverage: null,
            dataCapture: {
              validHours: 100,
              expectedHours: 168,
              capturePercentage: 60,
              isLowDataCapture: true
            }
          })
        }),
        ['PM2.5']
      )

      expect(result.pollutants[0].average).toBe('-')
      expect(result.pollutants[0].dataCapturePercentage).toBe(60)
      expect(result.pollutants[0].lowDataCapture).toBe(true)
    })

    it('does not flag low data capture when the average is available', () => {
      const result = summariseStationHistory(
        history({ PM25: summaryFor({ periodAverage: 12 }) }),
        ['PM2.5']
      )

      expect(result.pollutants[0].lowDataCapture).toBe(false)
    })

    it('takes the low data capture flag from the back end, not from the percentage', () => {
      // 70% would be under 75, but the back end says the average is fine.
      const result = summariseStationHistory(
        history({
          PM25: summaryFor({
            dataCapture: {
              validHours: 118,
              expectedHours: 168,
              capturePercentage: 70,
              isLowDataCapture: false
            }
          })
        }),
        ['PM2.5']
      )

      expect(result.pollutants[0].lowDataCapture).toBe(false)
    })

    it('assesses data capture independently for each pollutant', () => {
      const result = summariseStationHistory(
        history({
          NO2: summaryFor({ periodAverage: 30 }),
          O3: summaryFor({
            periodAverage: null,
            dataCapture: {
              validHours: 90,
              expectedHours: 168,
              capturePercentage: 54,
              isLowDataCapture: true
            }
          })
        }),
        ['Nitrogen dioxide', 'Ozone']
      )

      expect(
        result.pollutants.map((p) => [p.average, p.lowDataCapture])
      ).toEqual([
        [30, false],
        ['-', true]
      ])
    })

    it('shows a real zero average as 0, not as withheld', () => {
      const result = summariseStationHistory(
        history({ O3: summaryFor({ periodAverage: 0 }) }),
        ['Ozone']
      )

      expect(result.pollutants[0].average).toBe(0)
    })

    it('does not calculate an average from the raw readings', () => {
      const result = summariseStationHistory(
        history(
          { PM25: summaryFor({ periodAverage: null }) },
          {
            pollutants: {
              PM25: Array.from({ length: 168 }, (_, i) => ({
                time: `2026-08-19T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
                value: 50
              }))
            }
          }
        ),
        ['PM2.5']
      )

      expect(result.pollutants[0].average).toBe('-')
    })
  })

  describe('exceedance counts', () => {
    it("passes counts through and shows 'no legal limit' for null", () => {
      const result = summariseStationHistory(
        history({
          NO2: summaryFor({ hourlyExceedances: 2, dailyExceedances: null }),
          PM10: summaryFor({ hourlyExceedances: null, dailyExceedances: 3 })
        }),
        ['Nitrogen dioxide', 'PM10']
      )

      expect(result.pollutants[0]).toMatchObject({
        hourlyCount: 2,
        dailyCount: 'no legal limit'
      })
      expect(result.pollutants[1]).toMatchObject({
        hourlyCount: 'no legal limit',
        dailyCount: 3
      })
    })

    it('keeps a count of zero as 0, not as no legal limit', () => {
      const result = summariseStationHistory(
        history({
          SO2: summaryFor({ hourlyExceedances: 0, dailyExceedances: 0 })
        }),
        ['Sulphur dioxide']
      )

      expect(result.pollutants[0]).toMatchObject({
        hourlyCount: 0,
        dailyCount: 0
      })
    })
  })

  it('maps every back-end pollutant code to its display name', () => {
    const result = summariseStationHistory(
      history({
        PM25: summaryFor(),
        PM10: summaryFor(),
        NO2: summaryFor(),
        O3: summaryFor(),
        SO2: summaryFor()
      }),
      ['PM2.5', 'PM10', 'Nitrogen dioxide', 'Ozone', 'Sulphur dioxide']
    )

    expect(result.pollutants).toHaveLength(5)
  })

  it('falls back to the back-end code for an unknown pollutant', () => {
    const result = summariseStationHistory(
      history({ CO: summaryFor({ periodAverage: 1 }) }),
      ['CO']
    )

    expect(result.pollutants[0]).toMatchObject({
      pollutantName: 'CO',
      average: 1
    })
  })

  it('produces no rows, rather than inventing figures, when the response has no summary', () => {
    const result = summariseStationHistory(
      {
        ...WINDOW,
        pollutants: {
          PM25: [{ time: '2026-08-19T01:00:00.000Z', value: 8 }]
        }
      },
      ['PM2.5']
    )

    expect(result.pollutants).toEqual([])
    expect(result.periodStart).toBe('2026-08-19T00:00:00.000Z')
  })
})
