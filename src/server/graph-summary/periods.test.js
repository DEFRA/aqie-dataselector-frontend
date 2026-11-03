import {
  PERIOD_KEYS,
  DEFAULT_PERIOD,
  historyPeriodFor,
  formatPeriodDates
} from '~/src/server/graph-summary/periods.js'

describe('periods', () => {
  it('offers the last 24 hours and the last 7 days, opening on the last 24 hours', () => {
    expect(PERIOD_KEYS).toEqual(['last24hours', 'last7days'])
    expect(DEFAULT_PERIOD).toBe('last24hours')
  })

  describe('historyPeriodFor', () => {
    it.each([
      ['last24hours', '24h'],
      ['last7days', '7d']
    ])('maps %s to the %s history period', (period, expected) => {
      expect(historyPeriodFor(period)).toBe(expected)
    })

    it.each(['unknown', 'constructor', undefined])(
      'has no history period for %s',
      (period) => {
        expect(historyPeriodFor(period)).toBeUndefined()
      }
    )
  })

  // The window is the time each end hour began, as resolveStationHistory returns it.
  describe('formatPeriodDates', () => {
    const last24Hours = {
      periodStart: '2026-09-20T12:00:00.000Z',
      periodEnd: '2026-09-21T11:00:00.000Z'
    }
    const last7Days = {
      periodStart: '2026-09-14T00:00:00.000Z',
      periodEnd: '2026-09-20T23:00:00.000Z'
    }

    it('shows a single date, the day of the latest reading, for the last 24 hours', () => {
      expect(formatPeriodDates('last24hours', last24Hours)).toBe(
        '21 September 2026'
      )
    })

    it('shows the first and last day of the window for the last 7 days', () => {
      expect(formatPeriodDates('last7days', last7Days)).toBe(
        '14 September to 20 September 2026'
      )
    })

    it('crosses a month boundary', () => {
      expect(
        formatPeriodDates('last7days', {
          periodStart: '2026-09-27T00:00:00.000Z',
          periodEnd: '2026-10-03T23:00:00.000Z'
        })
      ).toBe('27 September to 3 October 2026')
    })

    it('crosses a year boundary', () => {
      expect(
        formatPeriodDates('last7days', {
          periodStart: '2025-12-28T00:00:00.000Z',
          periodEnd: '2026-01-03T23:00:00.000Z'
        })
      ).toBe('28 December to 3 January 2026')
    })

    it('includes 29 February in a leap year', () => {
      expect(
        formatPeriodDates('last7days', {
          periodStart: '2028-02-27T00:00:00.000Z',
          periodEnd: '2028-03-04T23:00:00.000Z'
        })
      ).toBe('27 February to 4 March 2028')
    })

    it('decides the day in UTC, not in the local time zone', () => {
      expect(
        formatPeriodDates('last24hours', {
          periodEnd: '2026-09-20T23:00:00.000Z'
        })
      ).toBe('20 September 2026')
      expect(
        formatPeriodDates('last24hours', {
          periodEnd: '2026-09-21T00:00:00.000Z'
        })
      ).toBe('21 September 2026')
    })

    it('needs only the end of the window for the last 24 hours', () => {
      expect(
        formatPeriodDates('last24hours', {
          periodEnd: '2026-09-21T11:00:00.000Z'
        })
      ).toBe('21 September 2026')
    })

    it.each([
      ['no window', undefined],
      ['an empty window', {}],
      ['the no-mapping marker', { noMapping: true }],
      ['null ends', { periodStart: null, periodEnd: null }],
      [
        'an unparseable end',
        { periodStart: '2026-09-14T00:00:00.000Z', periodEnd: 'yesterday' }
      ]
    ])('is empty for %s', (_name, window) => {
      expect(formatPeriodDates('last24hours', window)).toBe('')
      expect(formatPeriodDates('last7days', window)).toBe('')
    })

    it('is empty for a range with no start', () => {
      expect(
        formatPeriodDates('last7days', { periodEnd: last7Days.periodEnd })
      ).toBe('')
    })

    it.each(['unknown', undefined])('is empty for the period %s', (period) => {
      expect(formatPeriodDates(period, last7Days)).toBe('')
    })
  })
})
