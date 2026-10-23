import { buildMockLast7DaysSummary } from './last-7-days-mock.js'

describe('buildMockLast7DaysSummary', () => {
  it('returns one entry per known pollutant the station monitors, in order', () => {
    const result = buildMockLast7DaysSummary(['Nitrogen dioxide', 'PM2.5'])

    expect(result.pollutants).toEqual([
      expect.objectContaining({ pollutantName: 'Nitrogen dioxide' }),
      expect.objectContaining({ pollutantName: 'PM2.5' })
    ])
  })

  it('omits pollutants with no mock fixture', () => {
    const result = buildMockLast7DaysSummary(['PM2.5', 'Unknown pollutant'])

    expect(result.pollutants).toHaveLength(1)
    expect(result.pollutants[0].pollutantName).toBe('PM2.5')
  })

  it('returns an empty pollutants list when none are given', () => {
    expect(buildMockLast7DaysSummary().pollutants).toEqual([])
    expect(buildMockLast7DaysSummary([]).pollutants).toEqual([])
  })

  it('returns a 7-day window ending today', () => {
    const result = buildMockLast7DaysSummary(['PM2.5'])

    const periodEnd = new Date(result.periodEnd)
    const periodStart = new Date(result.periodStart)
    const today = new Date()

    expect(periodEnd.getUTCDate()).toBe(
      new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
      ).getUTCDate()
    )
    expect(
      Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000)
    ).toBe(6)
  })

  it('gives each returned pollutant a data capture percentage and average', () => {
    const [entry] = buildMockLast7DaysSummary(['Sulphur dioxide']).pollutants

    expect(entry).toEqual(
      expect.objectContaining({
        pollutantName: 'Sulphur dioxide',
        dataCapturePercentage: expect.any(Number),
        average: expect.any(Number),
        dailyCount: expect.any(Number),
        hourlyCount: expect.any(Number)
      })
    )
  })
})
