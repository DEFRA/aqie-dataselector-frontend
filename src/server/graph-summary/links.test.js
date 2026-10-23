import {
  GRAPH_SUMMARY_PATH,
  buildGraphSummaryHref,
  buildStationPageHref
} from '~/src/server/graph-summary/links.js'

describe('buildGraphSummaryHref', () => {
  it('links to the graph summary page', () => {
    expect(GRAPH_SUMMARY_PATH).toBe('/stationdetails/graph-summary')
  })

  it('opens on the last 24 hours by default', () => {
    expect(buildGraphSummaryHref({ stationId: 'site1' })).toBe(
      '/stationdetails/graph-summary?stationId=site1&period=last24hours'
    )
  })

  it('uses the given period', () => {
    expect(
      buildGraphSummaryHref({ stationId: 'site1', period: 'last7days' })
    ).toBe('/stationdetails/graph-summary?stationId=site1&period=last7days')
  })

  it('url-encodes the station id', () => {
    const href = buildGraphSummaryHref({ stationId: 'A&B C/d?e=f#g' })

    expect(href).toBe(
      '/stationdetails/graph-summary?stationId=A%26B+C%2Fd%3Fe%3Df%23g&period=last24hours'
    )
  })

  it('flags the no-JavaScript journey only when asked to', () => {
    expect(
      buildGraphSummaryHref({ stationId: 'site1', nojs: false })
    ).not.toContain('nojs')
    expect(buildGraphSummaryHref({ stationId: 'site1', nojs: true })).toBe(
      '/stationdetails/graph-summary?stationId=site1&period=last24hours&nojs=true'
    )
  })
})

describe('buildStationPageHref', () => {
  it('returns to the station page for the JavaScript journey', () => {
    expect(buildStationPageHref({ stationId: 'site1' })).toBe('/stationdetails')
  })

  it('returns to the no-JavaScript station page, encoding the id, for the no-JavaScript journey', () => {
    expect(buildStationPageHref({ stationId: 'a/b c', nojs: true })).toBe(
      '/stationDetailsNojs/a%2Fb%20c'
    )
  })
})
