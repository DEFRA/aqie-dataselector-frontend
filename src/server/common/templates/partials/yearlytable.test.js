import path from 'node:path'
import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'

import * as globals from '~/src/config/nunjucks/globals/globals.js'

const templates = path.resolve(process.cwd(), 'src/server/common/templates')
const components = path.resolve(process.cwd(), 'src/server/common/components')

const GRAPH_SUMMARY_LINK = 'a[href^="/stationdetails/graph-summary"]'

function render(context) {
  const env = nunjucks.configure(
    [path.resolve('node_modules/govuk-frontend/dist/'), templates, components],
    { autoescape: true, trimBlocks: true, lstripBlocks: true, noCache: true }
  )
  Object.entries(globals).forEach(([name, value]) => env.addGlobal(name, value))
  return cheerio.load(env.render('partials/yearlytable.njk', context))
}

const tabledata = [
  {
    pollutantName: 'Nitrogen dioxide',
    dataCapturePercentage: 98,
    annualcount: 31,
    dailyCount: 0,
    hourlyCount: 0
  }
]

const viewGraphSummary = {
  buttonText: 'View graph and pollutant summary',
  href: '/stationdetails/graph-summary?stationId=site1&period=last7days'
}

describe('yearlytable.njk graph summary button', () => {
  it('is wrapped in aq-js-only so users without JavaScript do not see it', () => {
    const $ = render({ tabledata, finalyear: 2025, viewGraphSummary })
    const link = $(GRAPH_SUMMARY_LINK)

    expect(link).toHaveLength(1)
    expect(link.text()).toContain('View graph and pollutant summary')
    expect(link.closest('.aq-js-only')).toHaveLength(1)
  })

  it('is not rendered when the feature flag is off', () => {
    const $ = render({ tabledata, finalyear: 2025, viewGraphSummary: null })

    expect($(GRAPH_SUMMARY_LINK)).toHaveLength(0)
    expect($('.aq-js-only')).toHaveLength(0)
  })
})
