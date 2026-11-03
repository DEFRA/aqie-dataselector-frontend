import { bisector } from 'd3-array'

const SVG_NS = 'http://www.w3.org/2000/svg'
const DOT_RADIUS = 4
const TOOLTIP_GAP = 12
const TOOLTIP_TOP_GAP = 4
const TENTHS = 10
const SWATCH_WIDTH = 26
const SWATCH_HEIGHT = 8
const SWATCH_STROKE_WIDTH = 3

// UTC, like the readings and the hourly data table.
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

const nearestIndex = bisector((time) => time).center

const hasReading = (value) => value !== null && value !== undefined

const formatReading = (value) => String(Math.round(value * TENTHS) / TENTHS)

/** A short sample of a pollutant's line, as in the legend. */
function createSwatch(colour, dash) {
  const $svg = document.createElementNS(SVG_NS, 'svg')
  $svg.setAttribute('class', 'app-pollutant-graph__swatch')
  $svg.setAttribute('width', SWATCH_WIDTH)
  $svg.setAttribute('height', SWATCH_HEIGHT)
  $svg.setAttribute('aria-hidden', 'true')
  $svg.setAttribute('focusable', 'false')

  const $line = document.createElementNS(SVG_NS, 'line')
  $line.setAttribute('x1', 0)
  $line.setAttribute('y1', SWATCH_HEIGHT / 2)
  $line.setAttribute('x2', SWATCH_WIDTH)
  $line.setAttribute('y2', SWATCH_HEIGHT / 2)
  $line.setAttribute('stroke', colour)
  $line.setAttribute('stroke-width', SWATCH_STROKE_WIDTH)
  if (dash) {
    $line.setAttribute('stroke-dasharray', dash)
  }
  $svg.append($line)
  return $svg
}

/**
 * Shows the readings for one hour as the user moves across the graph: a
 * vertical line at that hour, a dot on each pollutant's line, and a tooltip
 * with the time, each reading and the verification status. The mouse or touch
 * picks the nearest hour, and the readings stay on screen after a tap until the
 * user taps elsewhere. Keyboard users get the same from the left and right
 * arrow keys, as the canvas is a single tab stop.
 */
class GraphTooltip {
  /**
   * @param {object} options
   * @param {HTMLElement} options.$canvas element the graph is drawn in
   * @param {object} options.svg d3 selection of the graph's svg
   * @param {Function} options.x scale from a time to a position in the svg
   * @param {Function} options.y scale from a reading to a position in the svg
   * @param {number} options.width width of the svg, in svg units
   * @param {{ left: number, right: number, top: number, bottom: number }} options.plot area the lines are drawn in
   * @param {object} options.data the graph's data, as in the page
   */
  constructor({ $canvas, svg, x, y, width, plot, data }) {
    this.$canvas = $canvas
    this.svg = svg
    this.x = x
    this.y = y
    this.width = width
    this.plot = plot
    this.data = data

    this.series = data.series.map(({ name, colour, dash, points }) => ({
      name,
      colour,
      dash,
      lookup: new Map(points)
    }))
    this.times = [
      ...new Set(data.series.flatMap(({ points }) => points.map(([t]) => t)))
    ].sort((a, b) => a - b)
    this.index = null
    this.focusedByPointer = false
  }

  attach() {
    this.createGuide()
    this.createTooltip()
    this.createOverlay()
    this.bindKeyboard()
    this.bindTapElsewhere()
  }

  createGuide() {
    this.$guide = this.svg
      .append('line')
      .attr('class', 'app-pollutant-graph__guide')
      .attr('y1', this.plot.top)
      .attr('y2', this.plot.bottom)
      .attr('display', 'none')

    this.dots = this.series.map(({ colour }) =>
      this.svg
        .append('circle')
        .attr('class', 'app-pollutant-graph__dot')
        .attr('r', DOT_RADIUS)
        .attr('fill', colour)
        .attr('display', 'none')
    )
  }

  createTooltip() {
    this.$tooltip = document.createElement('div')
    this.$tooltip.className = 'app-pollutant-graph__tooltip'
    this.$tooltip.setAttribute('role', 'status')
    this.$tooltip.hidden = true
    this.$canvas.append(this.$tooltip)
  }

  createOverlay() {
    const { left, right, top, bottom } = this.plot

    this.svg
      .append('rect')
      .attr('class', 'app-pollutant-graph__overlay')
      .attr('x', left)
      .attr('y', top)
      .attr('width', right - left)
      .attr('height', bottom - top)
      .attr('fill', 'transparent')
      .on('pointermove', (event) => this.onPointer(event))
      // A tap does not move, so it picks the hour as the finger lifts
      .on('pointerup', (event) => this.onPointer(event))
      .on('pointerleave', (event) => this.onPointerLeave(event))
  }

  bindKeyboard() {
    const { $canvas } = this

    $canvas.setAttribute('tabindex', '0')
    $canvas.setAttribute('role', 'group')
    $canvas.setAttribute('aria-label', this.data.keyboardHint)

    $canvas.addEventListener('pointerdown', () => {
      this.focusedByPointer = true
    })
    $canvas.addEventListener('focus', () => {
      if (!this.focusedByPointer) {
        this.activate(this.times.length - 1, 'keyboard')
      }
    })
    $canvas.addEventListener('blur', () => {
      this.focusedByPointer = false
      this.deactivate()
    })
    $canvas.addEventListener('keydown', (event) => this.onKeyDown(event))
  }

  /** A finger leaves the graph as it lifts, so tapping elsewhere hides the readings. */
  bindTapElsewhere() {
    document.addEventListener('pointerdown', (event) => {
      if (!this.$canvas.contains(event.target)) {
        this.deactivate()
      }
    })
  }

  /** The pointer's position along the graph, in svg units. */
  svgX(event) {
    const rect = this.svg.node().getBoundingClientRect()
    const scale = rect.width ? this.width / rect.width : 1
    return (event.clientX - rect.left) * scale
  }

  onPointer(event) {
    const time = this.x.invert(this.svgX(event)).getTime()
    this.activate(nearestIndex(this.times, time), 'pointer')
  }

  onPointerLeave(event) {
    if (event.pointerType !== 'touch') {
      this.deactivate()
    }
  }

  onKeyDown(event) {
    const last = this.times.length - 1
    const current = this.index ?? last
    const moves = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: last
    }

    if (event.key === 'Escape') {
      this.hide()
    } else if (event.key in moves) {
      event.preventDefault()
      this.activate(Math.min(Math.max(moves[event.key], 0), last), 'keyboard')
    }
  }

  activate(index, source) {
    this.index = index
    const time = this.times[index]
    const position = this.x(time)

    this.$guide.attr('x1', position).attr('x2', position).attr('display', null)
    this.series.forEach(({ lookup }, seriesIndex) => {
      const value = lookup.get(time)
      this.dots[seriesIndex]
        .attr('cx', position)
        .attr('cy', hasReading(value) ? this.y(value) : null)
        .attr('display', hasReading(value) ? null : 'none')
    })

    this.showTooltip(time, position, source)
  }

  /** Hides the readings, but keyboard users carry on from the same hour. */
  hide() {
    this.$guide.attr('display', 'none')
    this.dots.forEach((dot) => dot.attr('display', 'none'))
    this.$tooltip.hidden = true
  }

  deactivate() {
    this.index = null
    this.hide()
  }

  buildContent(time) {
    const { unit, noReading, verificationStatus } = this.data
    const content = document.createDocumentFragment()

    const $time = document.createElement('strong')
    $time.className = 'app-pollutant-graph__tooltip-time'
    $time.textContent = timeFormat.format(time)
    content.append($time)

    this.series.forEach(({ name, colour, dash, lookup }) => {
      const value = lookup.get(time)
      const reading = hasReading(value)
        ? `${formatReading(value)} ${unit}`
        : noReading

      const $row = document.createElement('div')
      $row.className = 'app-pollutant-graph__tooltip-row'
      $row.append(createSwatch(colour, dash), `${name}: ${reading}`)
      content.append($row)
    })

    const $status = document.createElement('div')
    $status.className = 'app-pollutant-graph__tooltip-status'
    $status.textContent = verificationStatus
    content.append($status)

    return content
  }

  showTooltip(time, position, source) {
    // Only keyboard users need the readings announced as they move
    this.$tooltip.setAttribute(
      'aria-live',
      source === 'keyboard' ? 'polite' : 'off'
    )
    this.$tooltip.textContent = ''
    this.$tooltip.append(this.buildContent(time))
    this.$tooltip.hidden = false
    this.placeTooltip(position)
  }

  /** Beside the vertical line, on whichever side has room. */
  placeTooltip(position) {
    const rect = this.svg.node().getBoundingClientRect()
    const scale = rect.width ? rect.width / this.width : 1
    const line = position * scale
    const room = this.$canvas.clientWidth || Infinity
    const fitsRight = line + TOOLTIP_GAP + this.$tooltip.offsetWidth <= room

    const left = fitsRight
      ? line + TOOLTIP_GAP
      : Math.max(0, line - TOOLTIP_GAP - this.$tooltip.offsetWidth)

    this.$tooltip.style.left = `${left}px`
    this.$tooltip.style.top = `${this.plot.top * scale + TOOLTIP_TOP_GAP}px`
  }
}

export default GraphTooltip
