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

  it.each([
    ['last24hours', 'last24hours'],
    ['last7days', 'last7days'],
    ['2024', '2024'],
    [2024, '2024']
  ])(
    'passes on the tab it is on, %p, so Back returns to it',
    (from, expected) => {
      expect(buildGraphSummaryHref({ stationId: 'site1', from })).toBe(
        `/stationdetails/graph-summary?stationId=site1&period=last24hours&from=${expected}`
      )
    }
  )

  it.each([
    undefined,
    null,
    '',
    'daqi',
    'abc',
    '202',
    '20245',
    '../x',
    '2024/../x',
    'LAST7DAYS',
    '__proto__',
    'constructor'
  ])('leaves out a tab it cannot return to, such as %p', (from) => {
    expect(buildGraphSummaryHref({ stationId: 'site1', from })).toBe(
      '/stationdetails/graph-summary?stationId=site1&period=last24hours'
    )
  })
})

describe('buildStationPageHref', () => {
  it('returns to the station page for the JavaScript journey', () => {
    expect(buildStationPageHref({ stationId: 'site1' })).toBe('/stationdetails')
  })

  it.each([
    ['last24hours', '/stationdetails/last-24-hours'],
    ['last7days', '/stationdetails/last-7-days'],
    ['2024', '/stationdetails/year/2024']
  ])('returns to the %s tab the user came from', (from, expected) => {
    expect(buildStationPageHref({ stationId: 'site1', from })).toBe(expected)
  })

  it.each([undefined, '', 'daqi', 'abc', '20245', '../x', '__proto__'])(
    'returns to the default view when the tab is %p',
    (from) => {
      expect(buildStationPageHref({ stationId: 'site1', from })).toBe(
        '/stationdetails'
      )
    }
  )
})
