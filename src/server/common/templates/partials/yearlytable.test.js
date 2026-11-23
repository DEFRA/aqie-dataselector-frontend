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

describe('yearlytable.njk verification banner', () => {
  const withTag = (dataVerifiedTag) => [{ ...tabledata[0], dataVerifiedTag }]

  it.each([
    [
      'Data has not been verified',
      2026,
      'app-verification-banner',
      'Data has not been checked and verified'
    ],
    [
      'Data has been verified until 30 September',
      2025,
      'app-verification-banner app-verification-banner--partial',
      'Data has been checked and verified until 30 September 2025'
    ],
    [
      'Data has been verified',
      2024,
      'app-verification-banner app-verification-banner--verified',
      'Data has been checked and verified'
    ]
  ])(
    'maps "%s" for %s to the right banner',
    (tag, finalyear, classes, text) => {
      const $ = render({ tabledata: withTag(tag), finalyear })
      const banner = $('#yeartabble > .app-verification-banner')

      expect(banner).toHaveLength(1)
      expect(banner.attr('class')).toBe(classes)
      expect(banner.text().trim()).toBe(text)
    }
  )

  it('shows no banner when there is no data for the year', () => {
    const $ = render({ tabledata: null, finalyear: 2025 })

    expect($('.app-verification-banner')).toHaveLength(0)
  })
})
