import path from 'node:path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(path.resolve('src/server/common/templates')),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

const viewGraphSummary = {
  buttonText: 'View graph and pollutant summary',
  href: '/stationdetails/graph-summary?stationId=a&period=last24hours'
}

const render = (context) =>
  load(environment.render('partials/view-graph-summary.njk', context))

describe('view graph summary link', () => {
  it('links to the graph summary page', () => {
    const $ = render({ viewGraphSummary })

    expect($('a')).toHaveLength(1)
    expect($('a').attr('href')).toBe(viewGraphSummary.href)
    expect($('a').text().trim()).toBe('View graph and pollutant summary')
  })

  it('is announced once, as a link: it has no heading and does not override its role', () => {
    const $ = render({ viewGraphSummary })

    expect($('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
    expect($('a').attr('role')).toBeUndefined()
    expect($('[role]')).toHaveLength(0)
  })

  it('hides its icon from assistive technology, so the link is named by its text only', () => {
    const $ = render({ viewGraphSummary })

    expect($('a svg').attr('aria-hidden')).toBe('true')
    expect($('a svg').attr('focusable')).toBe('false')
    expect($('a').text().replaceAll(/\s+/g, ' ').trim()).toBe(
      'View graph and pollutant summary'
    )
  })

  it.each([null, undefined])(
    'renders nothing when the view model is %s',
    (value) => {
      const $ = render({ viewGraphSummary: value })

      expect($('a')).toHaveLength(0)
      expect($.root().text().trim()).toBe('')
    }
  )

  it('escapes the text and the link', () => {
    const $ = render({
      viewGraphSummary: {
        buttonText: '<img src=x onerror=alert(1)>',
        href: '/x" onclick="alert(1)'
      }
    })

    expect($('img')).toHaveLength(0)
    expect($('a').text().trim()).toBe('<img src=x onerror=alert(1)>')
    expect($('a').attr('onclick')).toBeUndefined()
    expect($('a').attr('href')).toBe('/x" onclick="alert(1)')
  })
})
