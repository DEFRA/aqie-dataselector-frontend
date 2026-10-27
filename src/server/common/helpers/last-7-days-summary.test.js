import { summariseStationHistory } from './last-7-days-summary.js'

function hourlyReadings(startIso, values) {
  return values.map((value, i) => ({
    time: new Date(Date.parse(startIso) + i * 60 * 60 * 1000).toISOString(),
    value
  }))
}

describe('summariseStationHistory', () => {
  it('maps the window and latest reading straight from the response', () => {
    const result = summariseStationHistory(
      {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-25T23:00:00.000Z',
        pollutants: {}
      },
      []
    )

    expect(result.periodStart).toBe('2026-08-19T00:00:00.000Z')
    expect(result.periodEnd).toBe('2026-08-25T23:00:00.000Z')
    expect(result.latestReadingAt).toBe('2026-08-25T23:00:00.000Z')
  })

  it('only includes pollutants the station monitors, in that order', () => {
    const result = summariseStationHistory(
      {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-25T23:00:00.000Z',
        pollutants: {
          PM25: hourlyReadings('2026-08-19T01:00:00.000Z', [8]),
          PM10: hourlyReadings('2026-08-19T01:00:00.000Z', [14]),
          NO2: hourlyReadings('2026-08-19T01:00:00.000Z', [52])
        }
      },
      ['Nitrogen dioxide', 'PM2.5']
    )

    expect(result.pollutants.map((p) => p.pollutantName)).toEqual([
      'Nitrogen dioxide',
      'PM2.5'
    ])
  })

  it('averages non-null values, rounded, and reports data capture out of 168', () => {
    const result = summariseStationHistory(
      {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-25T23:00:00.000Z',
        pollutants: {
          PM25: hourlyReadings('2026-08-19T01:00:00.000Z', [7, 8, 9, null])
        }
      },
      ['PM2.5']
    )

    expect(result.pollutants[0].average).toBe(8)
    // 3 valid of 4 readings sent, scaled against the fixed 168-hour week
    expect(result.pollutants[0].dataCapturePercentage).toBe(
      Math.round((3 / 168) * 100)
    )
  })

  it("shows '-' for average and 0% capture when every reading is null", () => {
    const result = summariseStationHistory(
      {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-25T23:00:00.000Z',
        pollutants: {
          PM25: hourlyReadings('2026-08-19T01:00:00.000Z', [null, null])
        }
      },
      ['PM2.5']
    )

    expect(result.pollutants[0].average).toBe('-')
    expect(result.pollutants[0].dataCapturePercentage).toBe(0)
  })

  it("counts hourly exceedances for NO2/SO2 and shows 'no legal limit' for others", () => {
    const result = summariseStationHistory(
      {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-25T23:00:00.000Z',
        pollutants: {
          NO2: hourlyReadings('2026-08-19T01:00:00.000Z', [201, 199, 250]),
          PM25: hourlyReadings('2026-08-19T01:00:00.000Z', [8])
        }
      },
      ['Nitrogen dioxide', 'PM2.5']
    )

    expect(result.pollutants[0].hourlyCount).toBe(2)
    expect(result.pollutants[1].hourlyCount).toBe('no legal limit')
  })

  it("counts daily exceedances for PM10/SO2 and shows 'no legal limit' for others", () => {
    // One full day (24 hours) averaging 60 (> the 50 PM10 daily limit)
    const overLimitDay = hourlyReadings(
      '2026-08-19T00:00:00.000Z',
      Array(24).fill(60)
    )
    const result = summariseStationHistory(
      {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-19T23:00:00.000Z',
        pollutants: {
          PM10: overLimitDay,
          Ozone: hourlyReadings('2026-08-19T00:00:00.000Z', [100])
        }
      },
      ['PM10', 'Ozone']
    )

    expect(result.pollutants[0].dailyCount).toBe(1)
    expect(result.pollutants[1].dailyCount).toBe('no legal limit')
  })

  it('excludes a day from the daily average when fewer than 18 of its hours are valid', () => {
    // 17 valid hours all over the limit, plus 7 nulls - should not count as a day
    const mostlyNullDay = hourlyReadings('2026-08-19T00:00:00.000Z', [
      ...Array(17).fill(60),
      ...Array(7).fill(null)
    ])
    const result = summariseStationHistory(
      {
        from: '2026-08-19T00:00:00.000Z',
        to: '2026-08-19T23:00:00.000Z',
        pollutants: { PM10: mostlyNullDay }
      },
      ['PM10']
    )

    expect(result.pollutants[0].dailyCount).toBe(0)
  })
})
