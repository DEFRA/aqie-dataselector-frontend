/**
 * @jest-environment jsdom
 */

import PollutantGraph, {
  formatHour,
  timeTicks
} from '~/src/client/javascripts/pollutant-graph.js'

const HOUR_MS = 60 * 60 * 1000
const START = Date.parse('2026-11-02T16:00:00.000Z')

// 24 hourly readings from 16:00 on 2 November to 15:00 on 3 November.
const hourly = (valueAt) =>
  Array.from({ length: 24 }, (_, hour) => [
    START + hour * HOUR_MS,
    valueAt(hour)
  ])

const DATA = {
  unit: 'µg/m³',
  label: 'Line chart of hourly readings in µg/m³ for PM2.5 and PM10.',
  series: [
    {
      code: 'PM25',
      name: 'PM2.5',
      colour: '#0b0c0c',
      dash: null,
      points: hourly((hour) => 5 + hour)
    },
    {
      code: 'PM10',
      name: 'PM10',
      colour: '#28a197',
      dash: '6,4',
      points: hourly((hour) => 10 + hour * 2)
    }
  ]
}

function buildModule(json = JSON.stringify(DATA)) {
  document.body.innerHTML = `
    <div data-module="app-pollutant-graph" hidden>
      <div data-graph-canvas></div>
      <script type="application/json" data-graph-data>${json}</script>
    </div>
  `
  return document.querySelector('[data-module="app-pollutant-graph"]')
}

const init = (json) => {
  const $module = buildModule(json)
  new PollutantGraph($module).init()
  return $module
}

describe('formatHour', () => {
  it.each([
    [0, '12am'],
    [1, '1am'],
    [6, '6am'],
    [11, '11am'],
    [12, '12pm'],
    [13, '1pm'],
    [18, '6pm'],
    [23, '11pm']
  ])('formats hour %i as %s', (hour, expected) => {
    expect(formatHour(new Date(Date.UTC(2026, 10, 3, hour)))).toBe(expected)
  })
})

describe('timeTicks', () => {
  const utc = (iso) => new Date(iso)

  it('labels every 6 hours for a day of readings, on whole UTC hours', () => {
    const ticks = timeTicks(
      [utc('2026-11-02T16:00:00.000Z'), utc('2026-11-03T15:00:00.000Z')],
      false
    )

    expect(ticks.map((tick) => tick.toISOString())).toEqual([
      '2026-11-02T18:00:00.000Z',
      '2026-11-03T00:00:00.000Z',
      '2026-11-03T06:00:00.000Z',
      '2026-11-03T12:00:00.000Z'
    ])
  })

  it('labels every midnight for a week of readings', () => {
    const ticks = timeTicks(
      [utc('2026-10-27T01:00:00.000Z'), utc('2026-11-03T00:00:00.000Z')],
      false
    )

    expect(ticks).toHaveLength(7)
    ticks.forEach((tick) => expect(tick.getUTCHours()).toBe(0))
    expect(ticks[0].toISOString()).toBe('2026-10-28T00:00:00.000Z')
    expect(ticks[6].toISOString()).toBe('2026-11-03T00:00:00.000Z')
  })

  it('labels every other day for a week of readings on a narrow screen', () => {
    const domain = [
      utc('2026-10-27T01:00:00.000Z'),
      utc('2026-11-03T00:00:00.000Z')
    ]

    const ticks = timeTicks(domain, true)

    expect(ticks.length).toBeLessThan(timeTicks(domain, false).length)
    ticks.slice(1).forEach((tick, index) => {
      expect(tick - ticks[index]).toBe(48 * HOUR_MS)
    })
  })
})

describe('PollutantGraph', () => {
  it('draws the graph and shows it', () => {
    const $module = init()

    expect($module.hidden).toBe(false)
    expect($module.querySelectorAll('[data-graph-canvas] svg')).toHaveLength(1)
  })

  it('describes the graph to assistive technology', () => {
    const $svg = init().querySelector('svg')

    expect($svg.getAttribute('role')).toBe('img')
    expect($svg.getAttribute('aria-label')).toBe(DATA.label)
  })

  it('draws a line for each pollutant in its colour and line style', () => {
    const $lines = init().querySelectorAll('path.app-pollutant-graph__line')

    expect($lines).toHaveLength(2)
    expect($lines[0].getAttribute('data-code')).toBe('PM25')
    expect($lines[0].getAttribute('stroke')).toBe('#0b0c0c')
    expect($lines[0].hasAttribute('stroke-dasharray')).toBe(false)
    expect($lines[1].getAttribute('data-code')).toBe('PM10')
    expect($lines[1].getAttribute('stroke')).toBe('#28a197')
    expect($lines[1].getAttribute('stroke-dasharray')).toBe('6,4')
  })

  it('draws a line through every reading', () => {
    const $line = init().querySelector('path.app-pollutant-graph__line')

    expect($line.getAttribute('d').match(/L/g)).toHaveLength(23)
  })

  it('breaks the line where a reading is missing, rather than joining across the gap', () => {
    const gappy = {
      ...DATA,
      series: [
        {
          ...DATA.series[0],
          points: hourly((hour) => (hour === 10 || hour === 11 ? null : hour))
        }
      ]
    }

    const $line = init(JSON.stringify(gappy)).querySelector(
      'path.app-pollutant-graph__line'
    )

    expect($line.getAttribute('d').match(/M/g)).toHaveLength(2)
  })

  it('marks a lone reading with a dot, as a line cannot show it', () => {
    const lone = {
      ...DATA,
      series: [
        {
          ...DATA.series[0],
          points: hourly((hour) => (hour === 5 ? 3 : null))
        }
      ]
    }

    const $dots = init(JSON.stringify(lone)).querySelectorAll(
      'circle.app-pollutant-graph__point'
    )

    expect($dots).toHaveLength(1)
    expect($dots[0].getAttribute('fill')).toBe('#0b0c0c')
  })

  it('does not draw dots for readings that a line joins', () => {
    expect(
      init().querySelectorAll('circle.app-pollutant-graph__point')
    ).toHaveLength(0)
  })

  it('shows the unit at the top of the value axis', () => {
    const $title = init().querySelector(
      '.app-pollutant-graph__axis-title:not(.app-pollutant-graph__axis-title--time)'
    )

    expect($title.textContent).toBe('µg/m³')
  })

  it('says the time axis is in UTC', () => {
    const $title = init().querySelector(
      '.app-pollutant-graph__axis-title--time'
    )

    expect($title.textContent).toBe('Time (UTC)')
  })

  it('draws a value axis that starts at zero and has room above the highest reading', () => {
    const $module = init()

    const ticks = [
      ...$module.querySelectorAll(
        '.app-pollutant-graph__axis--value .tick text'
      )
    ].map(($tick) => Number($tick.textContent))

    expect(ticks[0]).toBe(0)
    expect(ticks.at(-1)).toBeGreaterThan(10 + 23 * 2)
  })

  it('labels the time axis by the hour, with the date under the first label and each midnight', () => {
    const $labels = [
      ...init().querySelectorAll('.app-pollutant-graph__axis--time .tick text')
    ]

    expect(
      $labels.map(($label) => [
        $label.firstChild.textContent,
        $label.querySelector('tspan')?.textContent ?? null
      ])
    ).toEqual([
      ['6pm', '2 Nov'],
      ['12am', '3 Nov'],
      ['6am', null],
      ['12pm', null]
    ])
  })

  it('draws horizontal grid lines', () => {
    expect(
      init().querySelectorAll('.app-pollutant-graph__grid .tick line').length
    ).toBeGreaterThan(1)
  })

  describe('when there is nothing to draw', () => {
    it.each([
      ['no JSON', ''],
      ['JSON that cannot be read', '{not json'],
      ['JSON with no series', JSON.stringify({ ...DATA, series: [] })],
      ['JSON that is not an object', 'null']
    ])('stays hidden, with no graph, for %s', (_name, json) => {
      const $module = init(json)

      expect($module.hidden).toBe(true)
      expect($module.querySelector('svg')).toBeNull()
    })

    it('stays hidden when the page has nowhere to draw', () => {
      document.body.innerHTML =
        '<div data-module="app-pollutant-graph" hidden></div>'
      const $module = document.querySelector('[data-module]')

      new PollutantGraph($module).init()

      expect($module.hidden).toBe(true)
    })
  })

  it('hides the graph again if it cannot be drawn', () => {
    const broken = JSON.stringify({
      ...DATA,
      series: [{ ...DATA.series[0], points: 'not points' }]
    })
    const $module = buildModule(broken)

    expect(() => new PollutantGraph($module).init()).toThrow()
    expect($module.hidden).toBe(true)
  })
})
