/**
 * @jest-environment jsdom
 */

import PollutantGraph from '~/src/client/javascripts/pollutant-graph.js'

const HOUR_MS = 60 * 60 * 1000
const START = Date.parse('2026-11-02T16:00:00.000Z')
const HOURS = 24

// The graph is drawn 640 wide with a 44 left and 18 right margin when jsdom
// cannot measure it, so the readings are spread over 44 to 622.
const PLOT_LEFT = 44
const PLOT_WIDTH = 578
const xOf = (index) => PLOT_LEFT + (index / (HOURS - 1)) * PLOT_WIDTH

const hourly = (valueAt) =>
  Array.from({ length: HOURS }, (_, hour) => [
    START + hour * HOUR_MS,
    valueAt(hour)
  ])

const MISSING_HOUR = 3

const DATA = {
  unit: 'µg/m³',
  label: 'Line chart of hourly readings in µg/m³ for PM2.5 and PM10.',
  keyboardHint: 'Use the left and right arrow keys to move between hours.',
  verificationStatus: 'Unverified',
  noReading: 'No data',
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
      points: hourly((hour) =>
        hour === MISSING_HOUR ? null : 10.26 + hour * 2
      )
    }
  ]
}

let $canvas

function draw() {
  document.body.innerHTML = `
    <div data-module="app-pollutant-graph" hidden>
      <div data-graph-canvas></div>
      <script type="application/json" data-graph-data>${JSON.stringify(DATA)}</script>
    </div>
  `
  new PollutantGraph(
    document.querySelector('[data-module="app-pollutant-graph"]')
  ).init()
  $canvas = document.querySelector('[data-graph-canvas]')
}

const pointer = (type, clientX = 0, pointerType = 'mouse') => {
  const event = new MouseEvent(type, {
    clientX,
    bubbles: type !== 'pointerleave'
  })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

const overlay = () => $canvas.querySelector('.app-pollutant-graph__overlay')
const tooltip = () => $canvas.querySelector('.app-pollutant-graph__tooltip')
const guide = () => $canvas.querySelector('.app-pollutant-graph__guide')
const dots = () => [...$canvas.querySelectorAll('.app-pollutant-graph__dot')]

const moveTo = (index) =>
  overlay().dispatchEvent(pointer('pointermove', xOf(index)))
const leave = () => overlay().dispatchEvent(pointer('pointerleave'))
const press = (key) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true
  })
  $canvas.dispatchEvent(event)
  return event
}

const tooltipRows = () =>
  [...tooltip().querySelectorAll('.app-pollutant-graph__tooltip-row')].map(
    ($row) => $row.textContent
  )
const tooltipTime = () =>
  tooltip().querySelector('.app-pollutant-graph__tooltip-time').textContent

describe('GraphTooltip', () => {
  beforeEach(draw)

  describe('before the user points at the graph', () => {
    it('has no tooltip, vertical line or dots showing', () => {
      expect(tooltip().hidden).toBe(true)
      expect(guide().getAttribute('display')).toBe('none')
      dots().forEach(($dot) =>
        expect($dot.getAttribute('display')).toBe('none')
      )
    })

    it('has a dot for each pollutant, in its colour', () => {
      expect(dots().map(($dot) => $dot.getAttribute('fill'))).toEqual([
        '#0b0c0c',
        '#28a197'
      ])
    })

    it('has a tooltip that assistive technology treats as a status message', () => {
      expect(tooltip().getAttribute('role')).toBe('status')
    })
  })

  describe('as the user moves across the graph', () => {
    it('shows the time and date of the hour they are at', () => {
      moveTo(0)
      expect(tooltipTime()).toBe('2 Nov 2026, 16:00')

      moveTo(HOURS - 1)
      expect(tooltipTime()).toBe('3 Nov 2026, 15:00')
    })

    it('shows each pollutant with its reading and the unit', () => {
      moveTo(5)

      expect(tooltipRows()).toEqual(['PM2.5: 10 µg/m³', 'PM10: 20.3 µg/m³'])
    })

    it('shows each pollutant name beside a sample of its colour and line style', () => {
      moveTo(5)

      const swatches = [
        ...tooltip().querySelectorAll('.app-pollutant-graph__swatch line')
      ]
      expect(swatches.map(($line) => $line.getAttribute('stroke'))).toEqual([
        '#0b0c0c',
        '#28a197'
      ])
      expect(swatches[0].hasAttribute('stroke-dasharray')).toBe(false)
      expect(swatches[1].getAttribute('stroke-dasharray')).toBe('6,4')
    })

    it('shows the verification status', () => {
      moveTo(5)

      expect(
        tooltip().querySelector('.app-pollutant-graph__tooltip-status')
          .textContent
      ).toBe('Unverified')
    })

    it('draws a vertical line at the hour', () => {
      moveTo(10)

      expect(guide().hasAttribute('display')).toBe(false)
      expect(Number(guide().getAttribute('x1'))).toBeCloseTo(xOf(10), 5)
      expect(Number(guide().getAttribute('x2'))).toBeCloseTo(xOf(10), 5)
    })

    it('highlights the reading on each pollutant line', () => {
      moveTo(10)

      dots().forEach(($dot) => {
        expect($dot.hasAttribute('display')).toBe(false)
        expect(Number($dot.getAttribute('cx'))).toBeCloseTo(xOf(10), 5)
        expect(Number($dot.getAttribute('cy'))).toBeGreaterThan(0)
      })
    })

    it('puts a higher reading higher up the graph', () => {
      moveTo(10)

      const [pm25, pm10] = dots().map(($dot) => Number($dot.getAttribute('cy')))
      expect(pm10).toBeLessThan(pm25)
    })

    it('updates as the user moves on to another hour', () => {
      moveTo(2)
      moveTo(20)

      expect(tooltipTime()).toBe('3 Nov 2026, 12:00')
      expect(tooltipRows()[0]).toBe('PM2.5: 25 µg/m³')
      expect(Number(guide().getAttribute('x1'))).toBeCloseTo(xOf(20), 5)
    })

    it('snaps to the nearest hour', () => {
      overlay().dispatchEvent(pointer('pointermove', xOf(7) + 10))

      expect(tooltipTime()).toBe('2 Nov 2026, 23:00')
    })

    it('says there is no data, and shows no dot, for a pollutant with no reading that hour', () => {
      moveTo(MISSING_HOUR)

      expect(tooltipRows()).toEqual(['PM2.5: 8 µg/m³', 'PM10: No data'])
      expect(dots()[0].hasAttribute('display')).toBe(false)
      expect(dots()[1].getAttribute('display')).toBe('none')
    })

    it('does not announce the readings to screen readers as the mouse moves', () => {
      moveTo(5)

      expect(tooltip().getAttribute('aria-live')).toBe('off')
    })
  })

  describe('when the user moves away from the graph', () => {
    it('hides the tooltip, the vertical line and the dots', () => {
      moveTo(5)
      leave()

      expect(tooltip().hidden).toBe(true)
      expect(guide().getAttribute('display')).toBe('none')
      dots().forEach(($dot) =>
        expect($dot.getAttribute('display')).toBe('none')
      )
    })

    it('shows them again when they come back', () => {
      moveTo(5)
      leave()
      moveTo(8)

      expect(tooltip().hidden).toBe(false)
      expect(tooltipTime()).toBe('3 Nov 2026, 00:00')
    })
  })

  describe('for keyboard users', () => {
    it('makes the graph a single tab stop, with a hint on how to use it', () => {
      expect($canvas.getAttribute('tabindex')).toBe('0')
      expect($canvas.getAttribute('role')).toBe('group')
      expect($canvas.getAttribute('aria-label')).toBe(DATA.keyboardHint)
    })

    it('starts at the latest reading when the graph gets focus', () => {
      $canvas.focus()

      expect(tooltip().hidden).toBe(false)
      expect(tooltipTime()).toBe('3 Nov 2026, 15:00')
      expect(Number(guide().getAttribute('x1'))).toBeCloseTo(xOf(HOURS - 1), 5)
    })

    it('moves back an hour with the left arrow and on an hour with the right arrow', () => {
      $canvas.focus()

      press('ArrowLeft')
      press('ArrowLeft')
      expect(tooltipTime()).toBe('3 Nov 2026, 13:00')

      press('ArrowRight')
      expect(tooltipTime()).toBe('3 Nov 2026, 14:00')
    })

    it('jumps to the first and last hour with Home and End', () => {
      $canvas.focus()

      press('Home')
      expect(tooltipTime()).toBe('2 Nov 2026, 16:00')

      press('End')
      expect(tooltipTime()).toBe('3 Nov 2026, 15:00')
    })

    it('stops at the first and last hour', () => {
      $canvas.focus()

      press('ArrowRight')
      expect(tooltipTime()).toBe('3 Nov 2026, 15:00')

      press('Home')
      press('ArrowLeft')
      expect(tooltipTime()).toBe('2 Nov 2026, 16:00')
    })

    it('stops the page scrolling when an arrow key moves along the graph', () => {
      $canvas.focus()

      expect(press('ArrowLeft').defaultPrevented).toBe(true)
      expect(press('Home').defaultPrevented).toBe(true)
    })

    it('leaves other keys alone', () => {
      $canvas.focus()

      expect(press('Tab').defaultPrevented).toBe(false)
      expect(press('a').defaultPrevented).toBe(false)
      expect(tooltipTime()).toBe('3 Nov 2026, 15:00')
    })

    it('announces the readings to screen readers as the user moves', () => {
      $canvas.focus()
      press('ArrowLeft')

      expect(tooltip().getAttribute('aria-live')).toBe('polite')
    })

    it('hides the tooltip with Escape, and carries on from the same hour', () => {
      $canvas.focus()
      press('ArrowLeft')
      press('ArrowLeft')
      press('Escape')

      expect(tooltip().hidden).toBe(true)
      expect(guide().getAttribute('display')).toBe('none')

      press('ArrowRight')
      expect(tooltip().hidden).toBe(false)
      expect(tooltipTime()).toBe('3 Nov 2026, 14:00')
    })

    it('hides the tooltip when the graph loses focus', () => {
      $canvas.focus()
      $canvas.blur()

      expect(tooltip().hidden).toBe(true)
      expect(guide().getAttribute('display')).toBe('none')
    })

    it('does not show the tooltip just because the graph was clicked', () => {
      $canvas.dispatchEvent(pointer('pointerdown'))
      $canvas.focus()

      expect(tooltip().hidden).toBe(true)
    })

    it('shows the latest reading again when focus comes back by keyboard', () => {
      $canvas.dispatchEvent(pointer('pointerdown'))
      $canvas.focus()
      $canvas.blur()

      $canvas.focus()

      expect(tooltip().hidden).toBe(false)
    })
  })

  describe('for touch users', () => {
    const touch = (type, index = 0) =>
      overlay().dispatchEvent(pointer(type, xOf(index), 'touch'))

    // A finger is "leaving" the graph as soon as it lifts
    const tap = (index) => {
      touch('pointerdown', index)
      touch('pointerup', index)
      touch('pointerleave', index)
    }

    it('shows the hour that is tapped', () => {
      tap(5)

      expect(tooltip().hidden).toBe(false)
      expect(tooltipTime()).toBe('2 Nov 2026, 21:00')
      expect(Number(guide().getAttribute('x1'))).toBeCloseTo(xOf(5), 5)
    })

    it('keeps showing the readings after the finger lifts', () => {
      tap(5)
      tap(12)

      expect(tooltip().hidden).toBe(false)
      expect(tooltipTime()).toBe('3 Nov 2026, 04:00')
    })

    it('follows a finger dragged along the graph', () => {
      touch('pointermove', 2)
      touch('pointermove', 9)

      expect(tooltipTime()).toBe('3 Nov 2026, 01:00')
    })

    it('does not announce the readings to screen readers as the finger moves', () => {
      touch('pointermove', 2)

      expect(tooltip().getAttribute('aria-live')).toBe('off')
    })

    it('does not show the readings when the touch turns into a scroll', () => {
      touch('pointerdown', 5)
      touch('pointercancel', 5)
      touch('pointerleave', 5)

      expect(tooltip().hidden).toBe(true)
    })

    it('hides the readings when the user taps elsewhere on the page', () => {
      tap(5)
      document.body.dispatchEvent(pointer('pointerdown', 0, 'touch'))

      expect(tooltip().hidden).toBe(true)
      expect(guide().getAttribute('display')).toBe('none')
    })

    it('keeps the readings when the user taps the tooltip', () => {
      tap(5)
      tooltip().dispatchEvent(pointer('pointerdown', 0, 'touch'))

      expect(tooltip().hidden).toBe(false)
    })
  })
})
