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

const TABLE_DATA = [
  {
    dataVerifiedTag: 'Data has been verified',
    pollutantName: 'PM2.5',
    dataCapturePercentage: 98,
    annualcount: 9,
    dailyCount: 0,
    hourlyCount: 0
  }
]

const hourlyReadings = (period, title, caption) => ({
  period,
  title,
  verificationBanner: 'Data has not been checked and verified',
  table: {
    caption,
    head: [{ text: 'Time (UTC)' }, { text: 'PM2.5', format: 'numeric' }],
    rows: [[{ text: '3 Nov 2026, 10:00' }, { text: '5.2', format: 'numeric' }]]
  }
})

const READINGS = [
  hourlyReadings(
    'last24hours',
    'View hourly data for the last 24 hours',
    'Hourly readings in µg/m³ for the last 24 hours'
  ),
  hourlyReadings(
    'last7days',
    'View hourly data for the last 7 days',
    'Hourly readings in µg/m³ for the last 7 days'
  )
]

function render(overrides = {}) {
  return load(
    environment.render('stationDetailsNojs/index.njk', {
      pageTitle: 'Stations summary details',
      stationdetails: {
        name: 'Birmingham A4540 Roadside',
        siteType: 'Urban Traffic'
      },
      years: [2025, 2026],
      selectedYear: '2026',
      finalyear: '2026',
      currentYear: 2026,
      currentdate: '12 November',
      tabledata: TABLE_DATA,
      hourlyReadings: READINGS,
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

const hourlyDetails = ($) =>
  $('details').filter((_i, el) => /View hourly data/.test($(el).text()))

describe('stationDetailsNojs/index.njk hourly readings', () => {
  it('has a collapsed section for each period in place of the graph button', () => {
    const $ = render()

    const summaries = hourlyDetails($)
      .map((_i, el) => $(el).children('summary').text().trim())
      .get()
    expect(summaries).toEqual([
      'View hourly data for the last 24 hours',
      'View hourly data for the last 7 days'
    ])
    expect(hourlyDetails($).filter('[open]')).toHaveLength(0)
  })

  it('has each period table, captioned for its period', () => {
    const $ = render()

    const captions = hourlyDetails($)
      .map((_i, el) => $(el).find('table caption').text().trim())
      .get()
    expect(captions).toEqual([
      'Hourly readings in µg/m³ for the last 24 hours',
      'Hourly readings in µg/m³ for the last 7 days'
    ])
  })

  it('says the readings have not been verified, inside each section', () => {
    const $ = render()

    expect(hourlyDetails($).find('.app-verification-banner')).toHaveLength(2)
    expect(
      hourlyDetails($).first().find('.app-verification-banner').text().trim()
    ).toBe('Data has not been checked and verified')
  })

  it('has no link to the graph page, which is for JavaScript users', () => {
    const $ = render()

    expect($('a[href*="graph-summary"]')).toHaveLength(0)
    expect($('body').text()).not.toContain('View graph and pollutant summary')
  })

  it('shows the readings before the download section', () => {
    const $ = render()

    const heading = $('#year-heading')
    expect(heading).toHaveLength(1)
    expect(heading.prevAll().find('details').length).toBeGreaterThan(0)
  })

  it('has no hourly sections when there are no readings', () => {
    const $ = render({ hourlyReadings: [] })

    expect(hourlyDetails($)).toHaveLength(0)
    expect($('#year-heading')).toHaveLength(1)
  })

  it('has no hourly sections when the readings are not given', () => {
    const $ = render({ hourlyReadings: undefined })

    expect(hourlyDetails($)).toHaveLength(0)
  })
})
