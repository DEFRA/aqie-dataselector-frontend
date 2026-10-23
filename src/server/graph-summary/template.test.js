import path from 'node:path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.resolve('node_modules/govuk-frontend/dist'),
    path.resolve('src/server/common/templates'),
    path.resolve('src/server/common/components'),
    path.resolve('src/server')
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
environment.addGlobal('govukRebrand', true)

const HEADING = 'Last 24 hours: Birmingham A4540 Roadside'

function render(overrides = {}) {
  return load(
    environment.render('graph-summary/index.njk', {
      pageTitle: HEADING,
      heading: HEADING,
      dates: '21 September 2026',
      periodNavigationLabel: 'Time period',
      periodTabs: [
        {
          label: 'Last 24 hours',
          href: '/stationdetails/graph-summary?stationId=a&period=last24hours',
          isCurrent: true
        },
        {
          label: 'Last 7 days',
          href: '/stationdetails/graph-summary?stationId=a&period=last7days',
          isCurrent: false
        }
      ],
      verificationBanner: 'Data has not been checked and verified',
      legalLimits:
        'The pollution levels shown are measured against UK legal limits.',
      displayBacklink: true,
      hrefq: '/stationdetails',
      // layout context
      serviceName: 'Get air pollution data',
      serviceUrl: '/',
      nonce: 'test-nonce',
      getAssetPath: (asset) => `/public/${asset}`,
      googleTagManagerKeys: [],
      ...overrides
    })
  )
}

describe('graph summary page', () => {
  it('has the period and station as its heading and page title', () => {
    const $ = render()

    expect($('h1').text().trim()).toBe(HEADING)
    expect($('title').text()).toContain(HEADING)
  })

  it('shows the date below the heading', () => {
    const $ = render({ dates: '15 September 2026 to 21 September 2026' })

    expect($('h1 + p').text().trim()).toBe(
      '15 September 2026 to 21 September 2026'
    )
  })

  it('offers the last 24 hours and the last 7 days as links in a labelled navigation', () => {
    const $ = render()

    expect($('nav[aria-label="Time period"]')).toHaveLength(1)
    const links = $('nav[aria-label="Time period"] a')
    expect(links.map((_i, link) => $(link).text().trim()).get()).toEqual([
      'Last 24 hours',
      'Last 7 days'
    ])
    expect(links.map((_i, link) => $(link).attr('href')).get()).toEqual([
      '/stationdetails/graph-summary?stationId=a&period=last24hours',
      '/stationdetails/graph-summary?stationId=a&period=last7days'
    ])
  })

  it('highlights the selected tab, and only that one', () => {
    const $ = render()

    const current = $('nav[aria-label="Time period"] a[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current.text().trim()).toBe('Last 24 hours')
  })

  it('highlights the other tab when it is the selected one', () => {
    const $ = render({
      periodTabs: [
        { label: 'Last 24 hours', href: '/a', isCurrent: false },
        { label: 'Last 7 days', href: '/b', isCurrent: true }
      ]
    })

    expect(
      $('nav[aria-label="Time period"] a[aria-current="page"]').text().trim()
    ).toBe('Last 7 days')
  })

  it('shows the verification banner below the tabs', () => {
    const $ = render()

    const banner = $('nav[aria-label="Time period"] ~ .app-verification-banner')
    expect(banner).toHaveLength(1)
    expect(banner.text().trim()).toBe('Data has not been checked and verified')
  })

  it('shows the UK legal limits text without a link', () => {
    const $ = render()

    const legalLimits = $('p:contains("UK legal limits")')
    expect(legalLimits).toHaveLength(1)
    expect(legalLimits.text().trim()).toBe(
      'The pollution levels shown are measured against UK legal limits.'
    )
    expect(legalLimits.find('a')).toHaveLength(0)
  })

  it('has a Back link to the station page', () => {
    const $ = render()

    const back = $('a.govuk-back-link')
    expect(back).toHaveLength(1)
    expect(back.attr('href')).toBe('/stationdetails')
    expect(back.text().trim()).toBe('Back')
  })

  it('has a Back link to the no-JavaScript station page for the no-JavaScript journey', () => {
    const $ = render({ hrefq: '/stationDetailsNojs/a' })

    expect($('a.govuk-back-link').attr('href')).toBe('/stationDetailsNojs/a')
  })

  it('escapes anything in the station name that looks like markup', () => {
    const $ = render({
      heading: 'Last 24 hours: <script>alert(1)</script>',
      pageTitle: 'Last 24 hours: <script>alert(1)</script>'
    })

    expect($('script:contains("alert(1)")')).toHaveLength(0)
    expect($('h1').text().trim()).toBe(
      'Last 24 hours: <script>alert(1)</script>'
    )
  })
})
