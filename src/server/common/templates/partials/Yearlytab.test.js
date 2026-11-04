import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'
import { formatDate } from '~/src/config/nunjucks/filters/format-date.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

function render(context) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  env.addFilter('formatDate', formatDate)
  return cheerio.load(
    env.render('partials/Yearlytab.njk', {
      years: [2026, 2025],
      currentYear: 2026,
      currentdate: '3 November',
      selectedYear: 2026,
      daqi: {},
      last24Hours: {},
      tabledata: null,
      ...context
    })
  )
}

const tabs = ($) =>
  $('.moj-sub-navigation__link')
    .map((_, el) => $(el).text().trim())
    .get()

const currentTab = ($) =>
  $('.moj-sub-navigation__link[aria-current="page"]')
    .map((_, el) => $(el).text().trim())
    .get()

describe('Yearlytab.njk period tabs', () => {
  it('lists Daily Air Quality Index, Last 24 hours, Last 7 days, then the years', () => {
    const $ = render({ activePeriod: 'daqi' })

    expect(tabs($)).toEqual([
      'Daily Air Quality Index',
      'Last 24 hours',
      'Last 7 days',
      '2026',
      '2025'
    ])
  })

  it('links the Last 24 hours tab to its own page', () => {
    const $ = render({ activePeriod: 'daqi' })

    expect($('#link-last-24-hours').attr('href')).toBe(
      '/stationdetails/last-24-hours'
    )
  })

  describe('when the Last 24 hours tab is active', () => {
    const context = {
      activePeriod: 'last24hours',
      last24Hours: {
        pollutants: [
          {
            pollutantName: 'PM2.5',
            dataCapturePercentage: 100,
            lowDataCapture: false,
            average: 12,
            dailyCount: 'no legal limit',
            hourlyCount: 'no legal limit'
          }
        ]
      }
    }

    it("sets the heading to 'Air pollution summary: last 24 hours'", () => {
      const $ = render(context)

      expect($('#airpollution-heading').text()).toBe(
        'Air pollution summary: last 24 hours'
      )
    })

    it('shows the current date as the date stamp', () => {
      const $ = render(context)

      expect($('#duration_current').text()).toBe('3 November 2026')
    })

    it('marks only the Last 24 hours tab as current', () => {
      const $ = render(context)

      expect(currentTab($)).toEqual(['Last 24 hours'])
      expect($('#link-last-24-hours').attr('aria-selected')).toBe('true')
    })

    it('renders the 24 hour table, not the year or DAQI table', () => {
      const $ = render(context)

      expect($('#last24hourstable')).toHaveLength(1)
      expect($('#daqitable')).toHaveLength(0)
      expect($('#aqitable')).toHaveLength(0)
    })
  })

  it('marks only the Daily Air Quality Index tab as current when it is active', () => {
    const $ = render({ activePeriod: 'daqi' })

    expect(currentTab($)).toEqual(['Daily Air Quality Index'])
  })

  it('marks only the selected year as current on the year tab', () => {
    const $ = render({ activePeriod: 'year', selectedYear: 2025 })

    expect(currentTab($)).toEqual(['2025'])
  })
})
