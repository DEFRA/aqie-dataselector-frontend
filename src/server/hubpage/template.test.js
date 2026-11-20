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
Object.entries(filters).forEach(([name, value]) =>
  environment.addFilter(name, value)
)

describe('hub page template', () => {
  test('Search on a map card is hidden without JavaScript, as the map needs it', () => {
    const $ = load(
      environment.render('hubpage/index.njk', {
        pageTitle: 'Get air pollution data',
        texts: { e: 'Search on a map' },
        mapUrl: '/map',
        getAssetPath: (asset) => `/public/${asset}`
      })
    )
    const card = $('a[href="/map"]').closest('li')
    expect(card.text()).toContain('Search on a map')
    expect(card.hasClass('aq-js-only')).toBe(true)
  })
})
