import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import { JSDOM } from 'jsdom'

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

  describe('DAQI tab graph summary button', () => {
    const daqi = {
      pollutants: [
        {
          pollutantName: 'PM2.5',
          average: 12,
          daqiIndex: 2,
          daqiBand: 'low',
          averagingPeriod: '24 hour average'
        }
      ]
    }
    const viewGraphSummary = {
      buttonText: 'View graph and pollutant summary',
      action: '/stationdetails/graph-summary',
      fields: { stationId: 'a', period: 'last24hours' }
    }

    it('has the button under the DAQI table when the page gives one', () => {
      const $ = render({ activePeriod: 'daqi', daqi, viewGraphSummary })

      const button = $('#daqi-hint').nextAll('.aq-js-only').find('form')
      expect(button).toHaveLength(1)
      expect(button.attr('action')).toBe(viewGraphSummary.action)
    })

    it('has no button when the page gives none', () => {
      const $ = render({ activePeriod: 'daqi', daqi, viewGraphSummary: null })

      expect($('form[action="/stationdetails/graph-summary"]')).toHaveLength(0)
    })
  })

  describe('no-JavaScript message', () => {
    it('does not claim to show a year on the DAQI view', () => {
      const $ = render({ activePeriod: 'daqi', selectedYear: 2025 })

      const message = $('noscript').text()
      expect(message).toContain('Daily Air Quality Index')
      expect(message).not.toContain('selected year')
    })

    it('does not claim to show a year on the Last 24 hours view', () => {
      const $ = render({ activePeriod: 'last24hours', selectedYear: 2025 })

      const message = $('noscript').text()
      expect(message).toContain('last 24 hours')
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

  describe('Last 24 hours tab', () => {
    const last24Hours = {
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
    const tabs = ($) =>
      $('.moj-sub-navigation__link')
        .map((_i, el) => $(el).text().trim())
        .get()
    const currentTab = ($) =>
      $('.moj-sub-navigation__link[aria-current="page"]')
        .map((_i, el) => $(el).text().trim())
        .get()

    it('sits between the DAQI and Last 7 days tabs and links to its own page', () => {
      const $ = render({ activePeriod: 'daqi' })

      expect(tabs($)).toEqual([
        'Daily Air Quality Index',
        'Last 24 hours',
        'Last 7 days',
        '2026',
        '2025',
        '2024'
      ])
      expect($('#link-last-24-hours').attr('href')).toBe(
        '/stationdetails/last-24-hours'
      )
    })

    it('is shown when the DAQI tab flag is off', () => {
      const $ = render({ viewDaqiTab: false, activePeriod: 'last24hours' })

      expect($('#link-daqi')).toHaveLength(0)
      expect($('#link-last-24-hours')).toHaveLength(1)
    })

    describe('when active', () => {
      const context = { activePeriod: 'last24hours', last24Hours }

      it("sets the heading to 'Air pollution summary: last 24 hours'", () => {
        const $ = render(context)

        expect($('#airpollution-heading').text()).toBe(
          'Air pollution summary: last 24 hours'
        )
      })

      it('shows the current date as the date stamp', () => {
        const $ = render(context)

        expect($('#duration_current').text()).toBe('5 November 2026')
      })

      it('marks only the Last 24 hours tab as current', () => {
        const $ = render({ ...context, selectedYear: 2025 })

        expect(currentTab($)).toEqual(['Last 24 hours'])
        expect($('#link-last-24-hours').attr('aria-selected')).toBe('true')
      })

      it('renders the 24 hour table, not the year or DAQI table', () => {
        const $ = render(context)

        expect($('#last24hourstable')).toHaveLength(1)
        expect($('#daqitable')).toHaveLength(0)
        expect($('#aqitable')).toHaveLength(0)
      })

      it('has the graph summary button under the 24 hour table when the page gives one', () => {
        const viewGraphSummary = {
          buttonText: 'View graph and pollutant summary',
          action: '/stationdetails/graph-summary',
          fields: { stationId: 'a', period: 'last24hours' }
        }

        const $ = render({ ...context, viewGraphSummary })

        const button = $('#last24hours-hint')
          .nextAll('.aq-js-only')
          .find('form')
        expect(button).toHaveLength(1)
        expect(button.attr('action')).toBe(viewGraphSummary.action)
      })

      it('has no graph summary button when the page gives none', () => {
        const $ = render({ ...context, viewGraphSummary: null })

        expect($('form[action="/stationdetails/graph-summary"]')).toHaveLength(
          0
        )
      })
    })
  })
})

const panel = (period) => `
  <table></table>
  <div class="aq-js-only">
    <form method="post" action="/stationdetails/graph-summary">
      <input type="hidden" name="period" value="${period}">
      <button type="submit">View graph and pollutant summary</button>
    </form>
  </div>`

describe('Yearlytab.njk tab script', () => {
  let pending
  let document

  beforeEach(() => {
    pending = {}
    const html = render({
      activePeriod: 'daqi',
      daqi: {
        pollutants: [
          {
            pollutantName: 'PM2.5',
            average: 12,
            daqiIndex: 2,
            daqiBand: 'low',
            averagingPeriod: '24 hour average'
          }
        ]
      },
      viewGraphSummary: {
        buttonText: 'View graph and pollutant summary',
        action: '/stationdetails/graph-summary',
        fields: { stationId: 'a', period: 'last24hours' }
      }
    }).html()
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      beforeParse(window) {
        window.fetch = (url) =>
          new Promise((resolve) => {
            pending[url] = (body) => resolve({ ok: true, text: () => body })
          })
      }
    })
    document = dom.window.document
  })

  const postedPeriods = () =>
    [
      ...document.querySelectorAll(
        '#yearlytable-container form[action="/stationdetails/graph-summary"]'
      )
    ].map((form) => form.querySelector('[name="period"]').value)

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

  it('removes the previous tab’s graph summary button as soon as another tab is chosen', () => {
    expect(postedPeriods()).toEqual(['last24hours'])

    document.getElementById('link-last-7-days').click()

    expect(postedPeriods()).toEqual([])
  })

  it('shows the button for the chosen tab once its table has loaded', async () => {
    document.getElementById('link-last-7-days').click()
    pending['/rendertable/last-7-days'](panel('last7days'))
    await flush()

    expect(postedPeriods()).toEqual(['last7days'])
  })

  it('ignores a slower response from a tab that is no longer selected', async () => {
    document.getElementById('link-last-24-hours').click()
    document.getElementById('link-last-7-days').click()

    pending['/rendertable/last-7-days'](panel('last7days'))
    await flush()
    pending['/rendertable/last-24-hours'](panel('last24hours'))
    await flush()

    expect(postedPeriods()).toEqual(['last7days'])
  })
})
