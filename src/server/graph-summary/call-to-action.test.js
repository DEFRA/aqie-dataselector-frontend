import { config } from '~/src/config/config.js'
import { buildViewGraphSummary } from '~/src/server/graph-summary/call-to-action.js'

describe('buildViewGraphSummary', () => {
  beforeEach(() => {
    config.set('featureFlags.viewGraphSummary', true)
  })

  it('returns null when the feature flag is off', () => {
    config.set('featureFlags.viewGraphSummary', false)

    expect(buildViewGraphSummary({ stationId: 'site1' })).toBeNull()
  })

  it.each([undefined, null, ''])(
    'returns null when the station id is %p, as there is nothing to link to',
    (stationId) => {
      expect(buildViewGraphSummary({ stationId })).toBeNull()
    }
  )

  it('posts the last 24 hours for the station to the graph page', () => {
    expect(buildViewGraphSummary({ stationId: 'site1' })).toEqual({
      buttonText: 'View graph and pollutant summary',
      action: '/stationdetails/graph-summary',
      fields: { stationId: 'site1', period: 'last24hours' }
    })
  })

  it('opens the graph page on the given period', () => {
    expect(
      buildViewGraphSummary({ stationId: 'site1', period: 'last7days' }).fields
    ).toEqual({ stationId: 'site1', period: 'last7days' })
  })

  it('passes on the station page tab the button is on, so Back returns to it', () => {
    expect(
      buildViewGraphSummary({
        stationId: 'site1',
        period: 'last7days',
        from: 'last7days'
      }).fields
    ).toEqual({ stationId: 'site1', period: 'last7days', from: 'last7days' })
  })

  it('leaves out a tab Back cannot return to, rather than post one that fails', () => {
    expect(
      buildViewGraphSummary({ stationId: 'site1', from: 'not-a-year' }).fields
    ).toEqual({ stationId: 'site1', period: 'last24hours' })
  })
})
