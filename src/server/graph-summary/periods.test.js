import {
  PERIOD_KEYS,
  DEFAULT_PERIOD,
  formatPeriodDates
} from '~/src/server/graph-summary/periods.js'

describe('periods', () => {
  it('offers the last 24 hours and the last 7 days, opening on the last 24 hours', () => {
    expect(PERIOD_KEYS).toEqual(['last24hours', 'last7days'])
    expect(DEFAULT_PERIOD).toBe('last24hours')
  })

  describe('formatPeriodDates', () => {
    const now = new Date('2026-09-21T10:30:00Z')

    it('shows a single date, today, for the last 24 hours', () => {
      expect(formatPeriodDates('last24hours', now)).toBe('21 September 2026')
    })

    it('shows the 7 days ending today as a range for the last 7 days', () => {
      expect(formatPeriodDates('last7days', now)).toBe(
        '15 September 2026 to 21 September 2026'
      )
    })

    it('crosses a month boundary', () => {
      expect(
        formatPeriodDates('last7days', new Date('2026-10-03T08:00:00Z'))
      ).toBe('27 September 2026 to 3 October 2026')
    })

    it('crosses a year boundary', () => {
      expect(
        formatPeriodDates('last7days', new Date('2026-01-03T08:00:00Z'))
      ).toBe('28 December 2025 to 3 January 2026')
    })

    it('includes 29 February in a leap year', () => {
      expect(
        formatPeriodDates('last7days', new Date('2028-03-04T08:00:00Z'))
      ).toBe('27 February 2028 to 4 March 2028')
    })

    it('decides the day in UTC, not in the local time zone', () => {
      expect(
        formatPeriodDates('last24hours', new Date('2026-09-20T23:59:59Z'))
      ).toBe('20 September 2026')
      expect(
        formatPeriodDates('last24hours', new Date('2026-09-21T00:00:00Z'))
      ).toBe('21 September 2026')
    })

    it.each(['unknown', 'constructor', undefined])(
      'treats %s as the default period',
      (period) => {
        expect(formatPeriodDates(period, now)).toBe('21 September 2026')
      }
    )

    it('defaults to the current date', () => {
      jest.useFakeTimers({ now: new Date('2026-09-21T10:30:00Z') })

      try {
        expect(formatPeriodDates('last24hours')).toBe('21 September 2026')
      } finally {
        jest.useRealTimers()
      }
    })
  })
})
