import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

function render(last7Days, extra = {}, options) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  return cheerio.load(
    env.render('partials/last7daystable.njk', { last7Days, ...extra }),
    options
  )
}

const row = (overrides) => ({
  pollutantName: 'PM2.5',
  dataCapturePercentage: 98,
  lowDataCapture: false,
  average: 8,
  dailyCount: 'no legal limit',
  hourlyCount: 'no legal limit',
  ...overrides
})

const TOGGLETIP_TEXT =
  'Data capture under 75% is low. We do not calculate the average when data capture is low.'

describe('last7daystable.njk low data capture behaviour', () => {
  it('shows the data verification banner above the table, using the shared banner component', () => {
    const $ = render({ pollutants: [row()] })

    const banner = $('.app-verification-banner')
    expect(banner).toHaveLength(1)
    expect(banner.text().trim()).toBe('Data has not been checked and verified')
    expect(banner.nextAll('.table-scroll-container')).toHaveLength(1)
    expect($('.govuk-inset-text.not-verified')).toHaveLength(0)
  })

  it('shows the UK legal limits text without a link', () => {
    const $ = render({ pollutants: [row()] })

    const hint = $('#last7days-hint')
    expect(hint.text().trim()).toBe(
      'The pollution levels shown are measured against UK legal limits.'
    )
    expect(hint.find('a')).toHaveLength(0)
  })

  it('uses table-scroll-container to match the year tables', () => {
    const $ = render({ pollutants: [row()] })

    expect($('.table-scroll-container')).toHaveLength(1)
    expect($('.table-scroll-container--fit')).toHaveLength(0)
  })

  it('shows the average and no tag when data capture is sufficient', () => {
    const $ = render({ pollutants: [row()] })
    const cells = $('#last7daystable tbody tr').first()

    expect(
      cells.find('.defra-aq-levels-table__cell--average').text()
    ).toContain('8')
    expect(cells.text()).not.toContain('Low data capture')
    expect(
      cells.find('.defra-aq-levels-table__cell--data-capture .defra-toggletip')
    ).toHaveLength(0)
  })

  it("shows '-', the 'Low data capture' tag, the capture % and the toggletip text when capture is low", () => {
    const $ = render({
      pollutants: [
        row({ lowDataCapture: true, dataCapturePercentage: 54, average: '-' })
      ]
    })
    const tableRow = $('#last7daystable tbody tr').first()
    const averageCell = tableRow
      .find('.defra-aq-levels-table__cell--average')
      .text()
      .trim()

    expect(averageCell).toBe('-')
    expect(tableRow.find('.govuk-tag').text()).toContain('Low data capture')
    expect(tableRow.text()).toContain('Data capture: 54%')
    expect(
      tableRow
        .find('.defra-aq-levels-table__cell--data-capture .defra-toggletip')
        .html()
    ).toContain(TOGGLETIP_TEXT)
  })

  it('does not show the average unit or its toggletip for a withheld average', () => {
    const $ = render({
      pollutants: [
        row({
          pollutantName: 'PM10',
          lowDataCapture: true,
          dataCapturePercentage: 40,
          average: '-'
        })
      ]
    })

    expect($('#last7daystable .defra-aq-value-with-tip').text()).not.toContain(
      'µg/m3'
    )
  })

  it('assesses each pollutant independently', () => {
    const $ = render({
      pollutants: [
        row({ pollutantName: 'Nitrogen dioxide', average: 30 }),
        row({
          pollutantName: 'Ozone',
          lowDataCapture: true,
          dataCapturePercentage: 60,
          average: '-'
        })
      ]
    })
    const rows = $('#last7daystable tbody tr')

    expect(rows.eq(0).text()).not.toContain('Low data capture')
    expect(
      rows.eq(0).find('.defra-aq-levels-table__cell--average').text()
    ).toContain('30')
    expect(rows.eq(1).text()).toContain('Low data capture')
    expect(
      rows.eq(1).find('.defra-aq-levels-table__cell--average').text().trim()
    ).toBe('-')
  })
})

describe('last7daystable.njk hourly exceedance toggletips', () => {
  it.each([
    [
      'Nitrogen dioxide',
      'Hourly nitrogen dioxide levels must not go above 200 micrograms per cubic metre (µg/m³) more than 18 times in a calendar year (when rounded to a whole number).'
    ],
    [
      'Sulphur dioxide',
      'Hourly sulphur dioxide levels must not go above 350 micrograms per cubic metre (µg/m³) more than 24 times in a calendar year (when rounded to a whole number).'
    ]
  ])('shows the shared %s copy', (pollutantName, text) => {
    const $ = render({
      pollutants: [row({ pollutantName, hourlyCount: 0 })]
    })

    expect(
      $('#last7daystable tbody .defra-aq-levels-table__cell--hourly').html()
    ).toContain(text)
  })
})

describe('last7daystable.njk page content', () => {
  const HINT =
    'The pollution levels shown are measured against UK legal limits.'

  it('shows the legal limits hint once, below the table, with its own id', () => {
    const $ = render({ pollutants: [row()] })
    const hint = $('#last7days-hint')

    expect(hint).toHaveLength(1)
    expect(hint.text().trim()).toBe(HINT)
    expect(hint.hasClass('govuk-hint')).toBe(true)
    expect($('#daqi-hint')).toHaveLength(0)
    expect($('#last7daystable').parent().next().attr('id')).toBe(
      'last7days-hint'
    )
  })

  it('renders the noMapping message without the table or hint', () => {
    const $ = render({ noMapping: true })

    expect($('.govuk-inset-text').text().trim()).toBe(
      'The last 7 days view is not available for this station.'
    )
    expect($('#last7daystable')).toHaveLength(0)
    expect($('#last7days-hint')).toHaveLength(0)
  })

  it('renders the noData message without the table or hint when there are no pollutants', () => {
    const $ = render({ pollutants: [] })

    expect($('.govuk-inset-text').text().trim()).toBe(
      'Could not load data for the last 7 days.'
    )
    expect($('#last7daystable')).toHaveLength(0)
    expect($('#last7days-hint')).toHaveLength(0)
  })
})

describe('last7daystable.njk hourly readings for users without JavaScript', () => {
  const HOURLY = {
    period: 'last7days',
    title: 'View hourly data for the last 7 days',
    table: {
      caption: 'Hourly readings in µg/m³ for the last 7 days',
      head: [{ text: 'Time (UTC)' }, { text: 'PM2.5', format: 'numeric' }],
      rows: [
        [{ text: '10:00, 3 Nov 2026' }, { text: '5.2', format: 'numeric' }]
      ]
    }
  }
  const last7Days = { pollutants: [row()] }
  const WITHOUT_JAVASCRIPT = { scriptingEnabled: false }

  it('has a collapsed section with the hourly table when JavaScript is off', () => {
    const $ = render(last7Days, { hourlyReadings: HOURLY }, WITHOUT_JAVASCRIPT)

    const section = $('noscript details')
    expect(section).toHaveLength(1)
    expect(section.attr('open')).toBeUndefined()
    expect(section.children('summary').text().trim()).toBe(HOURLY.title)
    expect(section.find('table caption').text().trim()).toBe(
      HOURLY.table.caption
    )
    expect(section.find('.app-verification-banner')).toHaveLength(0)
  })

  it('puts the section after the 7-day table and its hint', () => {
    const $ = render(last7Days, { hourlyReadings: HOURLY }, WITHOUT_JAVASCRIPT)

    expect($('#last7days-hint').nextAll('noscript')).toHaveLength(1)
  })

  it('keeps the section out of the page when JavaScript is on', () => {
    const $ = render(last7Days, { hourlyReadings: HOURLY })

    expect($('noscript')).toHaveLength(1)
    expect($('noscript details')).toHaveLength(0)
    expect($('details')).toHaveLength(0)
  })

  it('has no section when there are no hourly readings, as when the tab is swapped in', () => {
    const $ = render(last7Days, {}, WITHOUT_JAVASCRIPT)

    expect($('noscript')).toHaveLength(0)
    expect($('details')).toHaveLength(0)
  })
})
