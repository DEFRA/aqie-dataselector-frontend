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

describe('map page template', () => {
  test('Exit map links to the hub page, so it always leaves the map', () => {
    const $ = load(
      environment.render('map/index.njk', {
        pageTitle: 'Air quality map',
        dataSelectorUrl: '',
        getAssetPath: (asset) => `/public/${asset}`
      })
    )
    const exit = $('#exit-map')
    expect(exit.is('a')).toBe(true)
    expect(exit.attr('href')).toBe('/hubpage')
    expect(exit.text().trim()).toBe('Exit map')
  })
})
