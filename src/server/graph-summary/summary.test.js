import { buildPollutantSummary } from '~/src/server/graph-summary/summary.js'

describe('buildPollutantSummary', () => {
  const rows = [
    {
      pollutantName: 'PM2.5',
      dataCapturePercentage: 100,
      lowDataCapture: false,
      average: 12,
      dailyCount: 'no legal limit',
      hourlyCount: 'no legal limit'
    }
  ]

  it('gives the rows for the period, with the section title and legal limits text', () => {
    expect(
      buildPollutantSummary({ periodStart: 'a', pollutants: rows }, '24h')
    ).toEqual({
      title: 'View pollutant summary',
      period: '24h',
      rows,
      message: null,
      legalLimits:
        'The pollution levels shown are measured against UK legal limits.'
    })
  })

  it('keeps the period the rows are for', () => {
    expect(buildPollutantSummary({ pollutants: rows }, '7d').period).toBe('7d')
  })

  it('says the summary is not available for a station with no AURN site id', () => {
    const summary = buildPollutantSummary({ noMapping: true }, '24h')

    expect(summary.rows).toEqual([])
    expect(summary.message).toBe(
      'The pollutant summary is not available for this station.'
    )
  })

  it.each([
    ['the history could not be loaded', {}],
    ['the history has no summary figures', { pollutants: [] }]
  ])('says the summary could not be loaded when %s', (_name, history) => {
    const summary = buildPollutantSummary(history, '24h')

    expect(summary.rows).toEqual([])
    expect(summary.message).toBe(
      'Could not load the pollutant summary for this period.'
    )
  })
})
