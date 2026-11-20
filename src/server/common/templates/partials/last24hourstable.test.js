import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

function render(last24Hours, extra = {}, options) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  return cheerio.load(
    env.render('partials/last24hourstable.njk', { last24Hours, ...extra }),
    options
  )
}

const row = (overrides = {}) => ({
  pollutantName: 'PM2.5',
  dataCapturePercentage: 100,
  lowDataCapture: false,
  average: 12,
  dailyCount: 'no legal limit',
  hourlyCount: 'no legal limit',
  ...overrides
})

const cell = ($, rowIndex, modifier) =>
  $('#last24hourstable tbody tr')
    .eq(rowIndex)
    .find(`.defra-aq-levels-table__cell--${modifier}`)

const TOGGLETIP_TEXT = {
  'PM2.5':
    'Annual average PM2.5 levels at any site must not go above 20 micrograms per cubic metre (µg/m³) in a calendar year (when rounded to a whole number).',
  PM10: 'Annual average PM10 levels at any site must not go above 40 micrograms per cubic metre (µg/m³) in a calendar year (when rounded to a whole number).',
  'Nitrogen dioxide':
    'Annual average nitrogen dioxide levels at any site must not go above 40 micrograms per cubic metre (µg/m³) in a calendar year (when rounded to a whole number).',
  Ozone: 'There is no annual average limit value for ozone.',
  'Sulphur dioxide':
    'There is no annual average limit value for sulphur dioxide.'
}

describe('last24hourstable.njk', () => {
  it('renders the Pollutant, 24 hour average and Hourly exceedances columns', () => {
    const $ = render({ pollutants: [row()] })

    expect($('.table-scroll-container')).toHaveLength(1)
    expect(
      $('#last24hourstable thead th')
        .map((_, el) => $(el).text().trim())
        .get()
    ).toEqual(['Pollutant', '24 hour average', 'Hourly exceedances'])
  })

  it('shows the data verification banner above the table, using the shared banner component', () => {
    const $ = render({ pollutants: [row()] })

    const banner = $('.app-verification-banner')
    expect(banner).toHaveLength(1)
    expect(banner.text().trim()).toBe('Data has not been checked and verified')
    expect(banner.nextAll('.table-scroll-container')).toHaveLength(1)
    expect($('.govuk-inset-text.not-verified')).toHaveLength(0)
  })

  it('shows no banner when there is no table to describe', () => {
    expect(
      render({ noMapping: true })('.app-verification-banner')
    ).toHaveLength(0)
    expect(render({ pollutants: [] })('.app-verification-banner')).toHaveLength(
      0
    )
  })

  it('shows each pollutant with its data capture percentage', () => {
    const $ = render({
      pollutants: [
        row({ pollutantName: 'PM2.5', dataCapturePercentage: 100 }),
        row({ pollutantName: 'PM10', dataCapturePercentage: 96 })
      ]
    })

    expect(cell($, 0, 'pollutant').text()).toContain('PM2.5')
    expect(cell($, 0, 'pollutant').text()).toContain('Data capture: 100%')
    expect(cell($, 1, 'pollutant').text()).toContain('PM10')
    expect(cell($, 1, 'pollutant').text()).toContain('Data capture: 96%')
  })

  it.each(Object.entries(TOGGLETIP_TEXT))(
    'shows the 24 hour average with its toggletip for %s',
    (pollutantName, text) => {
      const $ = render({ pollutants: [row({ pollutantName, average: 12 })] })
      const average = cell($, 0, 'average')

      expect(average.text()).toContain('12 µg/m3')
      expect(average.find('.defra-toggletip').html()).toContain(text)
    }
  )

  it.each([
    [
      'Nitrogen dioxide',
      'Hourly nitrogen dioxide levels must not go above 200 micrograms per cubic metre (µg/m³) more than 18 times in a calendar year (when rounded to a whole number).'
    ],
    [
      'Sulphur dioxide',
      'Hourly sulphur dioxide levels must not go above 350 micrograms per cubic metre (µg/m³) more than 24 times in a calendar year (when rounded to a whole number).'
    ]
  ])(
    'shows the hourly exceedance count with its toggletip for %s',
    (pollutantName, text) => {
      const $ = render({
        pollutants: [row({ pollutantName, hourlyCount: 1 })]
      })
      const hourly = cell($, 0, 'hourly')

      expect(hourly.text()).toContain('1')
      expect(hourly.find('.defra-toggletip').html()).toContain(text)
    }
  )

  it.each(['PM2.5', 'PM10', 'Ozone'])(
    "shows 'no legal limit' with no hourly toggletip for %s",
    (pollutantName) => {
      const $ = render({ pollutants: [row({ pollutantName })] })
      const hourly = cell($, 0, 'hourly')

      expect(hourly.text().trim()).toBe('no legal limit')
      expect(hourly.find('.defra-toggletip')).toHaveLength(0)
    }
  )

  it('never shows an "Above limit" tag against a single day', () => {
    const $ = render({
      pollutants: [
        row({ pollutantName: 'Nitrogen dioxide', hourlyCount: 20 }),
        row({ pollutantName: 'Sulphur dioxide', hourlyCount: 30 })
      ]
    })

    expect($('#last24hourstable').text()).not.toContain('Above limit')
  })

  it('does not show a daily exceedances column', () => {
    const $ = render({ pollutants: [row()] })

    expect($('#last24hourstable').text()).not.toContain('Daily exceedances')
  })

  it("shows '-', the 'Low data capture' tag and its toggletip when capture is low", () => {
    const $ = render({
      pollutants: [
        row({ lowDataCapture: true, dataCapturePercentage: 54, average: '-' })
      ]
    })
    const pollutant = cell($, 0, 'pollutant')

    expect(cell($, 0, 'average').text().trim()).toBe('-')
    expect(pollutant.find('.govuk-tag').text()).toContain('Low data capture')
    expect(pollutant.text()).toContain('Data capture: 54%')
    expect(pollutant.find('.defra-toggletip').html()).toContain(
      'Data capture under 75% is low.'
    )
  })

  it('shows the legal limits hint without a link', () => {
    const $ = render({ pollutants: [row()] })

    expect($('#last24hours-hint').text()).toBe(
      'The pollution levels shown are measured against UK legal limits.'
    )
    expect($('#last24hours-hint a')).toHaveLength(0)
  })

  it("passes today's date to the tab's click handler when given one", () => {
    const $ = render(
      { pollutants: [row()] },
      { durationText: '3 November 2026' }
    )

    expect($('#last24hours-duration-value').text()).toBe('3 November 2026')
  })

  it('renders the no-mapping message when the station has no AURN siteId', () => {
    const $ = render({ noMapping: true })

    expect($('.govuk-inset-text').text().trim()).toBe(
      'The last 24 hours view is not available for this station.'
    )
  })

  it('renders the no-data message when there are no pollutant rows', () => {
    const $ = render({ pollutants: [] })

    expect($('.govuk-inset-text').text().trim()).toBe(
      'Could not load data for the last 24 hours.'
    )
    expect($('#last24hourstable')).toHaveLength(0)
  })
})

describe('last24hourstable.njk graph summary button', () => {
  const viewGraphSummary = {
    buttonText: 'View graph and pollutant summary',
    href: '/stationdetails/graph-summary?stationId=a&period=last24hours'
  }
  const BUTTON = 'a[href^="/stationdetails/graph-summary"]'

  it('has the button under the table and its legal limits text, for users with JavaScript', () => {
    const $ = render({ pollutants: [row()] }, { viewGraphSummary })

    expect($(BUTTON)).toHaveLength(1)
    expect($(BUTTON).attr('href')).toBe(viewGraphSummary.href)
    expect($(BUTTON).text().trim()).toBe('View graph and pollutant summary')
    expect($(BUTTON).parent().hasClass('aq-js-only')).toBe(true)
    expect($('#last24hours-hint').nextAll('.aq-js-only')).toHaveLength(1)
  })

  it('has no button when there is no view model, as when the feature is off', () => {
    const $ = render({ pollutants: [row()] }, { viewGraphSummary: null })

    expect($(BUTTON)).toHaveLength(0)
  })

  it.each([
    ['the station has no AURN siteId', { noMapping: true }],
    ['there is no data', { pollutants: [] }]
  ])('has no button when %s, as there is no table', (_name, last24Hours) => {
    const $ = render(last24Hours, { viewGraphSummary })

    expect($(BUTTON)).toHaveLength(0)
  })
})

describe('last24hourstable.njk hourly readings for users without JavaScript', () => {
  const HOURLY = {
    period: 'last24hours',
    title: 'View hourly data for the last 24 hours',
    table: {
      caption: 'Hourly readings in µg/m³ for the last 24 hours',
      head: [{ text: 'Time (UTC)' }, { text: 'PM2.5', format: 'numeric' }],
      rows: [
        [{ text: '10:00, 3 Nov 2026' }, { text: '5.2', format: 'numeric' }]
      ]
    }
  }
  const last24Hours = { pollutants: [row()] }
  const WITHOUT_JAVASCRIPT = { scriptingEnabled: false }

  it('has a collapsed section with the hourly table when JavaScript is off', () => {
    const $ = render(
      last24Hours,
      { hourlyReadings: HOURLY },
      WITHOUT_JAVASCRIPT
    )

    const section = $('noscript details')
    expect(section).toHaveLength(1)
    expect(section.attr('open')).toBeUndefined()
    expect(section.children('summary').text().trim()).toBe(HOURLY.title)
    expect(section.find('table caption').text().trim()).toBe(
      HOURLY.table.caption
    )
    expect(section.find('.app-verification-banner')).toHaveLength(0)
  })

  it('puts the section after the 24 hour table and its hint', () => {
    const $ = render(
      last24Hours,
      { hourlyReadings: HOURLY },
      WITHOUT_JAVASCRIPT
    )

    expect($('#last24hours-hint').nextAll('noscript')).toHaveLength(1)
  })

  it('keeps the section out of the page when JavaScript is on', () => {
    const $ = render(last24Hours, { hourlyReadings: HOURLY })

    expect($('noscript')).toHaveLength(1)
    expect($('noscript details')).toHaveLength(0)
    expect($('details')).toHaveLength(0)
  })

  it('has no section when there are no hourly readings, as when the tab is swapped in', () => {
    const $ = render(last24Hours, {}, WITHOUT_JAVASCRIPT)

    expect($('noscript')).toHaveLength(0)
    expect($('details')).toHaveLength(0)
  })
})
