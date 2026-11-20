import path from 'node:path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'
import * as filters from '~/src/config/nunjucks/filters/filters.js'

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.resolve('node_modules/govuk-frontend/dist'),
    path.resolve('src/server/common/templates'),
    path.resolve('src/server/common/components'),
    path.resolve('src/server')
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
Object.entries(globals).forEach(([name, value]) =>
  environment.addGlobal(name, value)
)
Object.entries(filters).forEach(([name, filter]) =>
  environment.addFilter(name, filter)
)

const viewGraphSummary = {
  buttonText: 'View graph and pollutant summary',
  href: '/stationdetails/graph-summary?stationId=a&period=last7days'
}
const BUTTON = 'a[href^="/stationdetails/graph-summary"]'

function render(overrides = {}) {
  return load(
    environment.render('stationdetails/last-7-days.njk', {
      pageTitle: 'Last 7 days',
      stationdetails: {
        name: 'Birmingham A4540 Roadside',
        region: 'West Midlands',
        siteType: 'Urban Traffic'
      },
      updatedTime: '10am on 3 November 2026',
      maplocation: 'https://www.google.co.uk/maps?q=52.4,-1.9',
      years: [2026, 2025],
      last7Days: {
        periodStart: '2026-10-27T00:00:00.000Z',
        periodEnd: '2026-11-02T23:00:00.000Z',
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
      },
      viewGraphSummary,
      // layout context
      serviceName: 'Get air pollution data',
      serviceUrl: '/',
      nonce: 'test-nonce',
      getAssetPath: (asset) => `/public/${asset}`,
      googleTagManagerKeys: [],
      ...overrides
    })
  )
}

describe('last 7 days page', () => {
  it('has the graph summary button under the 7 day table, for users with JavaScript', () => {
    const $ = render()

    const button = $('#last7days-hint').nextAll('.aq-js-only').find('a')
    expect(button).toHaveLength(1)
    expect(button.attr('href')).toBe(viewGraphSummary.href)
    expect(button.text().trim()).toBe('View graph and pollutant summary')
  })

  it('has no graph summary button when the page gives none', () => {
    const $ = render({ viewGraphSummary: null })

    expect($(BUTTON)).toHaveLength(0)
  })
})
