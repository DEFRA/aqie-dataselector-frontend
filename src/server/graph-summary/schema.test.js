import { graphSummaryQuerySchema } from '~/src/server/graph-summary/schema.js'
import { MAX_STATION_NAME_LENGTH } from '~/src/server/common/constants/magic-numbers.js'

describe('graphSummaryQuerySchema', () => {
  it('accepts a station id and a period', () => {
    const { value, error } = graphSummaryQuerySchema.validate({
      stationId: 'site1',
      period: 'last7days'
    })

    expect(error).toBeUndefined()
    expect(value).toEqual({
      stationId: 'site1',
      period: 'last7days',
      nojs: false
    })
  })

  it('defaults to the last 24 hours and the JavaScript journey', () => {
    const { value, error } = graphSummaryQuerySchema.validate({
      stationId: 'site1'
    })

    expect(error).toBeUndefined()
    expect(value).toEqual({
      stationId: 'site1',
      period: 'last24hours',
      nojs: false
    })
  })

  it.each(['last24hours', 'last7days'])('accepts the %s period', (period) => {
    expect(
      graphSummaryQuerySchema.validate({ stationId: 'site1', period }).error
    ).toBeUndefined()
  })

  it.each(['last30days', 'daily', '', 'LAST24HOURS', '__proto__'])(
    'rejects the period %p',
    (period) => {
      expect(
        graphSummaryQuerySchema.validate({ stationId: 'site1', period }).error
      ).toBeDefined()
    }
  )

  it.each([undefined, '', '   '])('rejects the station id %p', (stationId) => {
    expect(graphSummaryQuerySchema.validate({ stationId }).error).toBeDefined()
  })

  it('trims the station id', () => {
    expect(
      graphSummaryQuerySchema.validate({ stationId: '  site1  ' }).value
        .stationId
    ).toBe('site1')
  })

  it('rejects a station id longer than a station name can be', () => {
    const tooLong = 'a'.repeat(MAX_STATION_NAME_LENGTH + 1)

    expect(
      graphSummaryQuerySchema.validate({ stationId: tooLong }).error
    ).toBeDefined()
    expect(
      graphSummaryQuerySchema.validate({
        stationId: 'a'.repeat(MAX_STATION_NAME_LENGTH)
      }).error
    ).toBeUndefined()
  })

  it('reads the no-JavaScript flag from its query string form', () => {
    expect(
      graphSummaryQuerySchema.validate({ stationId: 's', nojs: 'true' }).value
        .nojs
    ).toBe(true)
    expect(
      graphSummaryQuerySchema.validate({ stationId: 's', nojs: 'false' }).value
        .nojs
    ).toBe(false)
  })

  it.each(['last24hours', 'last7days', '2024'])(
    'accepts the tab %s to return to',
    (from) => {
      const { value, error } = graphSummaryQuerySchema.validate({
        stationId: 'site1',
        from
      })

      expect(error).toBeUndefined()
      expect(value.from).toBe(from)
    }
  )

  it('has no tab to return to unless it is given one', () => {
    expect(
      graphSummaryQuerySchema.validate({ stationId: 'site1' }).value
    ).not.toHaveProperty('from')
  })

  it.each([
    'daqi',
    '',
    'abc',
    '202',
    '20245',
    '/stationdetails/last-7-days',
    'https://example.com',
    '__proto__'
  ])('rejects the tab %p to return to', (from) => {
    expect(
      graphSummaryQuerySchema.validate({ stationId: 'site1', from }).error
    ).toBeDefined()
  })

  it('rejects a no-JavaScript flag that is not a boolean', () => {
    expect(
      graphSummaryQuerySchema.validate({ stationId: 's', nojs: 'maybe' }).error
    ).toBeDefined()
  })
})
