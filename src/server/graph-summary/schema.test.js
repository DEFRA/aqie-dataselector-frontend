import { graphSummaryPayloadSchema } from '~/src/server/graph-summary/schema.js'
import { MAX_STATION_NAME_LENGTH } from '~/src/server/common/constants/magic-numbers.js'

describe('graphSummaryPayloadSchema', () => {
  it('accepts a station id and a period', () => {
    const { value, error } = graphSummaryPayloadSchema.validate({
      stationId: 'site1',
      period: 'last7days'
    })

    expect(error).toBeUndefined()
    expect(value).toEqual({
      stationId: 'site1',
      period: 'last7days'
    })
  })

  it('defaults to the last 24 hours', () => {
    const { value, error } = graphSummaryPayloadSchema.validate({
      stationId: 'site1'
    })

    expect(error).toBeUndefined()
    expect(value).toEqual({
      stationId: 'site1',
      period: 'last24hours'
    })
  })

  it.each(['last24hours', 'last7days'])('accepts the %s period', (period) => {
    expect(
      graphSummaryPayloadSchema.validate({ stationId: 'site1', period }).error
    ).toBeUndefined()
  })

  it.each(['last30days', 'daily', '', 'LAST24HOURS', '__proto__'])(
    'rejects the period %p',
    (period) => {
      expect(
        graphSummaryPayloadSchema.validate({ stationId: 'site1', period }).error
      ).toBeDefined()
    }
  )

  it.each([undefined, '', '   '])('rejects the station id %p', (stationId) => {
    expect(
      graphSummaryPayloadSchema.validate({ stationId }).error
    ).toBeDefined()
  })

  it('trims the station id', () => {
    expect(
      graphSummaryPayloadSchema.validate({ stationId: '  site1  ' }).value
        .stationId
    ).toBe('site1')
  })

  it('rejects a station id longer than a station name can be', () => {
    const tooLong = 'a'.repeat(MAX_STATION_NAME_LENGTH + 1)

    expect(
      graphSummaryPayloadSchema.validate({ stationId: tooLong }).error
    ).toBeDefined()
    expect(
      graphSummaryPayloadSchema.validate({
        stationId: 'a'.repeat(MAX_STATION_NAME_LENGTH)
      }).error
    ).toBeUndefined()
  })

  it.each(['last24hours', 'last7days', '2024'])(
    'accepts the tab %s to return to',
    (from) => {
      const { value, error } = graphSummaryPayloadSchema.validate({
        stationId: 'site1',
        from
      })

      expect(error).toBeUndefined()
      expect(value.from).toBe(from)
    }
  )

  it('has no tab to return to unless it is given one', () => {
    expect(
      graphSummaryPayloadSchema.validate({ stationId: 'site1' }).value
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
      graphSummaryPayloadSchema.validate({ stationId: 'site1', from }).error
    ).toBeDefined()
  })
})
