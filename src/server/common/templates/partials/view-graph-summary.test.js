import path from 'node:path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(path.resolve('src/server/common/templates')),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)

const viewGraphSummary = {
  buttonText: 'View graph and pollutant summary',
  action: '/stationdetails/graph-summary',
  fields: { stationId: 'a', period: 'last24hours', from: '2024' }
}

const render = (context) =>
  load(environment.render('partials/view-graph-summary.njk', context))

const hiddenFields = ($) =>
  Object.fromEntries(
    $('form input[type="hidden"]')
      .map((_i, input) => [[$(input).attr('name'), $(input).val()]])
      .get()
  )

describe('view graph summary button', () => {
  it('posts the station, period and origin tab to the graph summary page', () => {
    const $ = render({ viewGraphSummary })

    expect($('form')).toHaveLength(1)
    expect($('form').attr('method')).toBe('post')
    expect($('form').attr('action')).toBe('/stationdetails/graph-summary')
    expect(hiddenFields($)).toEqual(viewGraphSummary.fields)
    expect($('a')).toHaveLength(0)
  })

  it('submits with a button labelled by its text', () => {
    const $ = render({ viewGraphSummary })

    expect($('form button[type="submit"]')).toHaveLength(1)
    expect($('button').text().trim()).toBe('View graph and pollutant summary')
  })

  it('is hidden when JavaScript is off, as the graph needs it', () => {
    const $ = render({ viewGraphSummary })

    expect($('form').parent().hasClass('aq-js-only')).toBe(true)
  })

  it('is announced once, as a button: it has no heading and does not override its role', () => {
    const $ = render({ viewGraphSummary })

    expect($('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
    expect($('[role]')).toHaveLength(0)
  })

  it('hides its icon from assistive technology, so the button is named by its text only', () => {
    const $ = render({ viewGraphSummary })

    expect($('button svg').attr('aria-hidden')).toBe('true')
    expect($('button svg').attr('focusable')).toBe('false')
    expect($('button').text().replaceAll(/\s+/g, ' ').trim()).toBe(
      'View graph and pollutant summary'
    )
  })

  it.each([null, undefined])(
    'renders nothing when the view model is %s',
    (value) => {
      const $ = render({ viewGraphSummary: value })

      expect($('form')).toHaveLength(0)
      expect($.root().text().trim()).toBe('')
    }
  )

  it('escapes the text, the action and the field values', () => {
    const $ = render({
      viewGraphSummary: {
        buttonText: '<img src=x onerror=alert(1)>',
        action: '/x" onclick="alert(1)',
        fields: { stationId: '"><script>alert(1)</script>' }
      }
    })

    expect($('img, script')).toHaveLength(0)
    expect($('button').text().trim()).toBe('<img src=x onerror=alert(1)>')
    expect($('form').attr('onclick')).toBeUndefined()
    expect($('form').attr('action')).toBe('/x" onclick="alert(1)')
    expect($('input[name="stationId"]').val()).toBe(
      '"><script>alert(1)</script>'
    )
  })
})
