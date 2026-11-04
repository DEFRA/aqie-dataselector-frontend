import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

function render(last24Hours, extra = {}) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  return cheerio.load(
    env.render('partials/last24hourstable.njk', { last24Hours, ...extra })
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
  it('renders the notice and the Pollutant, 24 hour average and Hourly exceedances columns', () => {
    const $ = render({ pollutants: [row()] })

    expect($('.govuk-inset-text.not-verified').text().trim()).toBe(
      'Data has not been checked and verified'
    )
    expect($('.table-scroll-container')).toHaveLength(1)
    expect(
      $('#last24hourstable thead th')
        .map((_, el) => $(el).text().trim())
        .get()
    ).toEqual(['Pollutant', '24 hour average', 'Hourly exceedances'])
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

  it('links the legal limits hint', () => {
    const $ = render({ pollutants: [row()] })

    expect($('#last24hours-hint').text()).toBe(
      'The pollution levels shown are measured against UK legal limits.'
    )
    expect($('#last24hours-hint a').attr('href')).toBe(
      'https://www.gov.uk/guidance/air-pollution-uk-legal-limits'
    )
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
