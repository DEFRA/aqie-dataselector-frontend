import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

function render(daqi, extra = {}) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  return cheerio.load(env.render('partials/daqitable.njk', { daqi, ...extra }))
}

const row = (overrides = {}) => ({
  pollutantName: 'PM2.5',
  average: 12,
  daqiIndex: 2,
  daqiBand: 'low',
  averagingPeriod: '24 hour average',
  ...overrides
})

describe('daqitable.njk', () => {
  it('renders columns, toggletip on DAQI header, colour-coded DAQI tags, averaging periods and learn-more link', () => {
    const $ = render({
      pollutants: [
        row(),
        row({
          pollutantName: 'Nitrogen dioxide',
          average: 201,
          daqiIndex: 4,
          daqiBand: 'moderate',
          averagingPeriod: 'Hourly average'
        })
      ]
    })

    expect($('.table-scroll-container')).toHaveLength(1)
    expect($('.govuk-inset-text.not-verified').text().trim()).toBe(
      'Data has not been checked and verified'
    )

    const headers = $('#daqitable thead th')
      .map((_, el) => $(el).text().trim())
      .get()
    expect(headers[0]).toBe('Pollutant')
    expect(headers[1]).toBe('Average')
    expect(headers[2]).toContain('DAQI')
    expect(headers[3]).toBe('Averaging period')

    const daqiHeaderToggletip = $(
      '#daqitable thead th.defra-aq-levels-table__cell--daily-title .defra-toggletip'
    )
    expect(daqiHeaderToggletip).toHaveLength(1)
    expect(daqiHeaderToggletip.html()).toContain(
      'The Daily Air Quality Index (DAQI) is a simple 10-point scale designed to help people understand the short term risk of air pollution.'
    )

    const rows = $('#daqitable tbody tr')
    expect(rows).toHaveLength(2)

    expect(
      rows.eq(0).find('.defra-aq-levels-table__cell--pollutant').text().trim()
    ).toBe('PM2.5')
    expect(
      rows.eq(0).find('.defra-aq-levels-table__cell--average').text().trim()
    ).toBe('12 µg/m3')
    expect(rows.eq(0).find('.aq-daqi-band-tag--2').text().trim()).toBe(
      '2 (low)'
    )
    expect(
      rows.eq(0).find('.defra-aq-levels-table__cell--hourly').text().trim()
    ).toBe('24 hour average')

    expect(rows.eq(1).find('.aq-daqi-band-tag--4').text().trim()).toBe(
      '4 (moderate)'
    )
    expect(
      rows.eq(1).find('.defra-aq-levels-table__cell--hourly').text().trim()
    ).toBe('Hourly average')

    expect($('#daqi-hint').text()).toContain(
      'Learn more about the Daily Air Quality Index (DAQI).'
    )
  })

  it('does not render data capture percentage on DAQI rows', () => {
    const $ = render({ pollutants: [row()] })

    expect($('#daqitable').text()).not.toContain('Data capture')
  })

  it("renders '-' when a pollutant has no DAQI reading", () => {
    const $ = render({
      pollutants: [row({ average: '-', daqiIndex: null, daqiBand: null })]
    })
    const firstRow = $('#daqitable tbody tr').first()

    expect(
      firstRow.find('.defra-aq-levels-table__cell--average').text().trim()
    ).toBe('-')
    expect(
      firstRow.find('.defra-aq-levels-table__cell--daily').text().trim()
    ).toBe('-')
  })

  it('renders noMapping message when station has no AURN siteId', () => {
    const $ = render({ noMapping: true })

    expect($('.govuk-inset-text').text().trim()).toBe(
      'The Daily Air Quality Index view is not available for this station.'
    )
  })

  it('renders noData message when pollutants are empty', () => {
    const $ = render({ pollutants: [] })

    expect($('.govuk-inset-text').text().trim()).toBe(
      'Could not load Daily Air Quality Index data for this station.'
    )
  })
})
