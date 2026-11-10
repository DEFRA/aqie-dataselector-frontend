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
      years: [2026, 2025, 2024],
      currentYear: 2026,
      currentdate: '5 November',
      daqi: {},
      viewDaqiTab: true,
      ...context
    })
  )
}

describe('Yearlytab.njk', () => {
  describe('DAQI tab feature flag', () => {
    it('shows the DAQI tab and its script when the flag is on', () => {
      const $ = render({ activePeriod: 'daqi' })

      expect($('#link-daqi')).toHaveLength(1)
      expect($('script').html()).toContain('updateDaqi')
    })

    it('hides the DAQI tab and its script when the flag is off', () => {
      const $ = render({
        viewDaqiTab: false,
        activePeriod: 'year',
        selectedYear: 2025
      })

      expect($('#link-daqi')).toHaveLength(0)
      expect($('script').html()).not.toContain('updateDaqi')
      expect($('#link-last-7-days')).toHaveLength(1)
    })

    it('ignores a daqi active period when the flag is off', () => {
      const $ = render({ viewDaqiTab: false, activePeriod: 'daqi' })

      expect($('#airpollution-heading').text()).toContain(
        'Air pollution levels'
      )
    })
  })

  describe('year tabs', () => {
    it.each([
      ['DAQI view', { activePeriod: 'daqi' }],
      ['year view', { activePeriod: 'year', selectedYear: 2025 }]
    ])(
      'links each year to /stationdetails/year/{year} on the %s so they work without JavaScript',
      (_name, context) => {
        const $ = render(context)

        expect(
          $('.year-link')
            .map((_i, el) => $(el).attr('href'))
            .get()
        ).toEqual([
          '/stationdetails/year/2026',
          '/stationdetails/year/2025',
          '/stationdetails/year/2024'
        ])
        expect($('a[href^="javascript:"]')).toHaveLength(0)
      }
    )

    it('keeps the data-year attribute the click handler reads', () => {
      const $ = render({ activePeriod: 'daqi' })

      expect($('#link-2025').attr('data-year')).toBe('2025')
    })
  })

  describe('DAQI date', () => {
    it('shows the day the measured hour began, not the day its stamp falls on', () => {
      // The hour ending at local midnight began the previous day.
      const midnight = new Date(2026, 9, 31, 0, 0).toISOString()
      const periodDate = new Date(2026, 9, 30, 23, 0).toISOString()
      const $ = render({
        activePeriod: 'daqi',
        daqi: { measuredAt: midnight, periodDate, pollutants: [] }
      })

      expect($('#duration_current').text()).toBe('30 October 2026')
    })

    it('falls back to the current date when there is no measurement', () => {
      const $ = render({ activePeriod: 'daqi', daqi: {} })

      expect($('#duration_current').text()).toBe('5 November 2026')
    })
  })

  describe('no-JavaScript message', () => {
    it('does not claim to show a year on the DAQI view', () => {
      const $ = render({ activePeriod: 'daqi', selectedYear: 2025 })

      const message = $('noscript').text()
      expect(message).toContain('Daily Air Quality Index')
      expect(message).not.toContain('selected year')
    })

    it('keeps the selected-year message on a year view', () => {
      const $ = render({ activePeriod: 'year', selectedYear: 2025 })

      expect($('noscript').text()).toContain('selected year')
    })
  })

  describe('scripts', () => {
    it('declares the toggletip binding and getAPIstn_details1 once', () => {
      const $ = render({
        activePeriod: 'year',
        selectedYear: 2025,
        tabledata: null
      })
      const scripts = $('script')
        .map((_i, el) => $(el).html())
        .get()
        .join('\n')

      expect(scripts.match(/function getAPIstn_details1/g)).toHaveLength(1)
      expect(scripts.match(/aqTableToggletipsBound = true/g)).toHaveLength(1)
    })
  })
})
