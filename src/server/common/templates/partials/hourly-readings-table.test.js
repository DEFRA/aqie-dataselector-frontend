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
      '{% from "partials/hourly-readings-table.njk" import hourlyReadingsDetails %}{{ hourlyReadingsDetails(params) }}',
      { params }
    )
  )
}

const TABLE = {
  caption: 'Hourly readings in µg/m³ for the last 24 hours',
  head: [{ text: 'Time (UTC)' }, { text: 'PM2.5', format: 'numeric' }],
  rows: [
    [{ text: '10:00, 3 Nov 2026' }, { text: '5.2', format: 'numeric' }],
    [{ text: '11:00, 3 Nov 2026' }, { text: 'No data', format: 'numeric' }]
  ]
}

const PARAMS = { title: 'View hourly data for the last 24 hours', table: TABLE }

describe('hourly-readings-table partial', () => {
  it('is a details section, closed to start with, with the title as its summary', () => {
    const $ = render(PARAMS)

    expect($('details.govuk-details')).toHaveLength(1)
    expect($('details').attr('open')).toBeUndefined()
    expect($('summary').text().trim()).toBe(
      'View hourly data for the last 24 hours'
    )
  })

  it('has the table with its caption inside the section', () => {
    const $ = render(PARAMS)

    expect($('details table caption').text().trim()).toBe(TABLE.caption)
  })

  it('has a column heading for the time and each pollutant', () => {
    const $ = render(PARAMS)

    const headings = $('thead th')
      .map((_i, th) => $(th).text().trim())
      .get()
    expect(headings).toEqual(['Time (UTC)', 'PM2.5'])
  })

  it('makes the time of each row its row header, with the reading beside it', () => {
    const $ = render(PARAMS)

    const rows = $('tbody tr')
      .map((_i, tr) => [
        [
          $(tr).find('th[scope="row"]').text().trim(),
          $(tr).find('td').text().trim()
        ]
      ])
      .get()
    expect(rows).toEqual([
      ['10:00, 3 Nov 2026', '5.2'],
      ['11:00, 3 Nov 2026', 'No data']
    ])
  })

  it('scrolls sideways inside its container on a narrow screen', () => {
    const $ = render(PARAMS)

    expect($('details .table-scroll-container table')).toHaveLength(1)
  })

  it('has no verification banner', () => {
    const $ = render(PARAMS)

    expect($('.app-verification-banner')).toHaveLength(0)
  })
})
