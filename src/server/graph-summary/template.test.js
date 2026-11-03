import path from 'node:path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.resolve('node_modules/govuk-frontend/dist'),
    path.resolve('src/server/common/templates'),
    path.resolve('src/server/common/components'),
    path.resolve('src/server')
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
Object.entries(globals).forEach(([name, value]) =>
  environment.addGlobal(name, value)
)

const HEADING = 'Last 24 hours: Birmingham A4540 Roadside'
const LEGAL_LIMITS =
  'The pollution levels shown are measured against UK legal limits.'

const row = (overrides) => ({
  pollutantName: 'PM2.5',
  dataCapturePercentage: 100,
  lowDataCapture: false,
  average: 12,
  dailyCount: 'no legal limit',
  hourlyCount: 'no legal limit',
  ...overrides
})

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
      summary: {
        title: 'View pollutant summary',
        period: '24h',
        rows: [row()],
        message: null,
        legalLimits: LEGAL_LIMITS
      },
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
    const $ = render({ dates: '15 September to 21 September 2026' })

    expect($('h1 + p').text().trim()).toBe('15 September to 21 September 2026')
  })

  it('shows no date line when the dates are not known', () => {
    const $ = render({ dates: '' })

    expect($('h1 + p')).toHaveLength(0)
    expect($('h1 + nav[aria-label="Time period"]')).toHaveLength(1)
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

  it('shows the UK legal limits text beneath the summary table, without a link', () => {
    const $ = render()

    const legalLimits = $('p:contains("UK legal limits")')
    expect(legalLimits).toHaveLength(1)
    expect(legalLimits.text().trim()).toBe(LEGAL_LIMITS)
    expect(legalLimits.find('a')).toHaveLength(0)
    expect(
      $('details .table-scroll-container ~ p:contains("UK legal limits")')
    ).toHaveLength(1)
  })

  describe('pollutant summary section', () => {
    const headings = ($) =>
      $('details thead th')
        .map((_i, th) => $(th).text().trim())
        .get()

    it('is an expandable section below the verification banner, collapsed by default', () => {
      const $ = render()

      const details = $('details.govuk-details')
      expect(details).toHaveLength(1)
      expect(details.attr('open')).toBeUndefined()
      expect(details.find('summary').text().trim()).toBe(
        'View pollutant summary'
      )
      expect(
        $('.app-verification-banner ~ details.govuk-details')
      ).toHaveLength(1)
    })

    it('has the 24 hour average and hourly exceedances columns for the last 24 hours', () => {
      const $ = render()

      expect(headings($)).toEqual([
        'Pollutant',
        '24 hour average',
        'Hourly exceedances'
      ])
    })

    it('has the average, daily and hourly exceedances columns for the last 7 days', () => {
      const $ = render({
        summary: {
          title: 'View pollutant summary',
          period: '7d',
          rows: [row()],
          message: null,
          legalLimits: LEGAL_LIMITS
        }
      })

      expect(headings($)).toEqual([
        'Pollutant',
        'Average',
        'Daily exceedances',
        'Hourly exceedances'
      ])
    })

    it('shows each pollutant with its data capture, and no legal limit where none applies', () => {
      const $ = render({
        summary: {
          title: 'View pollutant summary',
          period: '24h',
          rows: [
            row({ pollutantName: 'PM10', dataCapturePercentage: 98 }),
            row({ pollutantName: 'Nitrogen dioxide', hourlyCount: 1 })
          ],
          message: null,
          legalLimits: LEGAL_LIMITS
        }
      })

      const rows = $('details tbody tr')
      expect(rows).toHaveLength(2)
      expect(rows.eq(0).text()).toContain('PM10')
      expect(rows.eq(0).text()).toContain('Data capture: 98%')
      expect(rows.eq(0).text()).toContain('no legal limit')
      expect(rows.eq(1).find('td').last().text().trim()).toBe('1')
    })

    it('shows plain figures, with no limit toggletips', () => {
      const $ = render()

      expect($('details td .defra-toggletip')).toHaveLength(0)
    })

    it('shows the message instead of the table when there are no rows', () => {
      const $ = render({
        summary: {
          title: 'View pollutant summary',
          period: '24h',
          rows: [],
          message: 'Could not load the pollutant summary for this period.',
          legalLimits: LEGAL_LIMITS
        }
      })

      expect($('details table')).toHaveLength(0)
      expect($('details p').text().trim()).toBe(
        'Could not load the pollutant summary for this period.'
      )
      expect($('p:contains("UK legal limits")')).toHaveLength(0)
    })
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
