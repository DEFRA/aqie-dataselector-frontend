import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

function render(params) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  return cheerio.load(
    env.renderString(
      '{% from "partials/pollutant-summary-table.njk" import pollutantSummaryTable %}{{ pollutantSummaryTable(params) }}',
      { params }
    )
  )
}

const row = (overrides) => ({
  pollutantName: 'PM2.5',
  dataCapturePercentage: 100,
  lowDataCapture: false,
  average: 12,
  dailyCount: 'no legal limit',
  hourlyCount: 'no legal limit',
  ...overrides
})

const headings = ($) =>
  $('thead th')
    .map((_i, th) => $(th).text().trim())
    .get()

const text = (cell) => cell.text().replaceAll(/\s+/g, ' ').trim()

const ROWS = [
  row(),
  row({ pollutantName: 'PM10', average: 18, dailyCount: 2 }),
  row({ pollutantName: 'Nitrogen dioxide', average: 52, hourlyCount: 1 })
]

describe('pollutant-summary-table.njk', () => {
  it('gives the table the id it is asked for', () => {
    const $ = render({ rows: ROWS, period: '7d', id: 'summary-table' })

    expect($('table#summary-table')).toHaveLength(1)
    expect($('.table-scroll-container table')).toHaveLength(1)
  })

  it('has a row for each pollutant, with its data capture', () => {
    const $ = render({ rows: ROWS, period: '7d', id: 't' })

    const rows = $('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows.eq(1).find('td').first().text()).toContain('PM10')
    expect(rows.eq(1).text()).toContain('Data capture: 100%')
  })

  describe('for the 7 day period', () => {
    it('has the average, daily and hourly exceedance columns', () => {
      const $ = render({ rows: ROWS, period: '7d', id: 't' })

      expect(headings($)).toEqual([
        'Pollutant',
        'Average',
        'Daily exceedances',
        'Hourly exceedances'
      ])
    })

    it('shows the average with its unit and a toggletip', () => {
      const $ = render({ rows: [row()], period: '7d', id: 't' })

      const average = $('td.defra-aq-levels-table__cell--average')
      expect(text(average.find('.defra-aq-value-with-tip'))).toContain(
        '12 µg/m3'
      )
      expect(average.find('.defra-toggletip')).toHaveLength(1)
    })

    it('shows a toggletip on the exceedance counts that have a limit', () => {
      const $ = render({ rows: ROWS, period: '7d', id: 't' })

      expect(
        $('td.defra-aq-levels-table__cell--daily .defra-toggletip')
      ).toHaveLength(1)
      expect(
        $('td.defra-aq-levels-table__cell--hourly .defra-toggletip')
      ).toHaveLength(1)
    })

    it('tags a daily count over the allowance as above limit', () => {
      const $ = render({
        rows: [row({ pollutantName: 'PM10', dailyCount: 36 })],
        period: '7d',
        id: 't'
      })

      expect($('tbody .govuk-tag').text()).toContain('Above limit')
    })
  })

  describe('for the 24 hour period', () => {
    it('has the 24 hour average and hourly exceedance columns, and no daily column', () => {
      const $ = render({ rows: ROWS, period: '24h', id: 't' })

      expect(headings($)).toEqual([
        'Pollutant',
        '24 hour average',
        'Hourly exceedances'
      ])
      expect($('.defra-aq-levels-table__cell--daily')).toHaveLength(0)
    })

    it('shows the figures under the right columns', () => {
      const $ = render({
        rows: [
          row({
            pollutantName: 'Nitrogen dioxide',
            average: 52,
            hourlyCount: 1
          })
        ],
        period: '24h',
        id: 't'
      })

      const cells = $('tbody tr').first().find('td')
      expect(cells).toHaveLength(3)
      expect(text(cells.eq(1))).toContain('52 µg/m3')
      expect(text(cells.eq(2))).toContain('1')
    })
  })

  describe('without limit toggletips', () => {
    const plain = (rows, period = '7d') =>
      render({ rows, period, id: 't', limitToggletips: false })

    it('shows the average and counts as plain figures', () => {
      const $ = plain(ROWS)

      const cells = $('tbody tr').eq(1).find('td')
      expect(text(cells.eq(1))).toBe('18 µg/m3')
      expect(text(cells.eq(2))).toBe('2')
      expect(text(cells.eq(3))).toBe('no legal limit')
      expect($('td .defra-toggletip')).toHaveLength(0)
      expect($('td .defra-aq-value-with-tip')).toHaveLength(0)
    })

    it('shows no above limit tag, however high the count', () => {
      const $ = plain([row({ pollutantName: 'PM10', dailyCount: 36 })])

      expect($('tbody .govuk-tag')).toHaveLength(0)
    })

    it('still explains a withheld average with the low data capture toggletip', () => {
      const $ = plain([
        row({ lowDataCapture: true, dataCapturePercentage: 54, average: '-' })
      ])

      const tableRow = $('tbody tr').first()
      expect(
        text(tableRow.find('td.defra-aq-levels-table__cell--average'))
      ).toBe('-')
      expect(tableRow.find('.govuk-tag').text()).toContain('Low data capture')
      expect(
        tableRow.find(
          '.defra-aq-levels-table__cell--data-capture .defra-toggletip'
        )
      ).toHaveLength(1)
    })

    it('has the same columns for the 24 hour period', () => {
      const $ = plain(ROWS, '24h')

      expect(headings($)).toEqual([
        'Pollutant',
        '24 hour average',
        'Hourly exceedances'
      ])
    })
  })
})
