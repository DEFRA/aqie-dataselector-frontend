import { renderComponent } from '~/src/server/common/test-helpers/component-helpers.js'

describe('Pollutant graph component', () => {
  const params = {
    unitText: 'The unit µg/m³ stands for micrograms per cubic metre of air.',
    legalLimits: 'Pollution levels are measured against UK legal limits.',
    legendLabel: 'Pollutants in the graph',
    legend: [
      { name: 'PM2.5', colour: '#0b0c0c', dash: null },
      { name: 'PM10', colour: '#28a197', dash: '6,4' }
    ],
    dataJson: '{"unit":"µg/m³","series":[]}'
  }

  const render = (overrides) =>
    renderComponent('pollutant-graph', { ...params, ...overrides })

  it('is hidden until the graph script has drawn the graph', () => {
    const $graph = render()

    const root = $graph('[data-module="app-pollutant-graph"]')
    expect(root).toHaveLength(1)
    expect(root.attr('hidden')).toBeDefined()
  })

  it('has the unit text above the graph and the legal limits text below it', () => {
    const $graph = render()

    const paragraphs = $graph('.app-pollutant-graph > p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs.first().text()).toBe(params.unitText)
    expect(
      paragraphs.first().nextAll('.app-pollutant-graph__canvas')
    ).toHaveLength(1)
    expect(paragraphs.last().text()).toBe(params.legalLimits)
    expect(paragraphs.last().find('a')).toHaveLength(0)
  })

  it('has a legend above the graph with an item for each pollutant', () => {
    const $graph = render()

    const legend = $graph('ul[aria-label="Pollutants in the graph"]')
    expect(legend).toHaveLength(1)
    expect(legend.nextAll('.app-pollutant-graph__canvas')).toHaveLength(1)
    expect(
      legend
        .find('li')
        .map((_i, item) => $graph(item).text().trim())
        .get()
    ).toEqual(['PM2.5', 'PM10'])
  })

  it('draws each legend swatch in the pollutant colour and line style', () => {
    const $graph = render()

    const swatches = $graph('.app-pollutant-graph__swatch line')
    expect(swatches.eq(0).attr('stroke')).toBe('#0b0c0c')
    expect(swatches.eq(0).attr('stroke-dasharray')).toBeUndefined()
    expect(swatches.eq(1).attr('stroke')).toBe('#28a197')
    expect(swatches.eq(1).attr('stroke-dasharray')).toBe('6,4')
  })

  it('hides the swatches from assistive technology, as the names carry the meaning', () => {
    const $graph = render()

    expect($graph('.app-pollutant-graph__swatch').attr('aria-hidden')).toBe(
      'true'
    )
  })

  it('has an empty canvas for the graph script to draw in', () => {
    const $graph = render()

    const canvas = $graph('[data-graph-canvas]')
    expect(canvas).toHaveLength(1)
    expect(canvas.children()).toHaveLength(0)
  })

  it('carries the data as JSON the graph script can read, which is not run as script', () => {
    const $graph = render()

    const data = $graph('script[type="application/json"][data-graph-data]')
    expect(data).toHaveLength(1)
    expect(JSON.parse(data.html())).toEqual({ unit: 'µg/m³', series: [] })
  })

  it('escapes anything in the legend that looks like markup', () => {
    const $graph = render({
      legend: [{ name: '<script>alert(1)</script>', colour: '#000000' }]
    })

    expect($graph('.app-pollutant-graph__legend script')).toHaveLength(0)
    expect($graph('.app-pollutant-graph__legend li').text().trim()).toBe(
      '<script>alert(1)</script>'
    )
  })
})
