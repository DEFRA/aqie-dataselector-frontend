import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

function render(last7Days) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  return cheerio.load(env.render('partials/last7daystable.njk', { last7Days }))
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
