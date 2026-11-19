import { select } from 'd3-selection'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { line } from 'd3-shape'
import { axisBottom, axisLeft } from 'd3-axis'
import { extent, max } from 'd3-array'
import PollutantGraphTooltip from './pollutant-graph-tooltip.js'

const HEIGHT = 360
const MARGIN = { top: 24, right: 18, bottom: 44, left: 44 }
const MIN_WIDTH = 320
const DEFAULT_WIDTH = 640
const NARROW_WIDTH = 500
const Y_TICK_COUNT = 6
const Y_HEADROOM = 1.1
const ISOLATED_POINT_RADIUS = 2.5
const AXIS_TITLE_Y = 12

const HOUR_MS = 60 * 60 * 1000
const HALF_DAY_HOURS = 12
const SHORT_SPAN_HOURS = 36
const SHORT_SPAN_STEP_HOURS = 6
const WIDE_STEP_HOURS = 24
const NARROW_STEP_HOURS = 48

// UTC, like the readings and the rest of the station pages.
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short'
})

/**
 * The hour of a time on a 12 hour clock, e.g. 12am, 6pm.
 * @param {Date} date
 * @returns {string}
 */
function formatHour(date) {
  const hour = date.getUTCHours()
  return `${hour % HALF_DAY_HOURS || HALF_DAY_HOURS}${hour < HALF_DAY_HOURS ? 'am' : 'pm'}`
}

/**
 * Where the time axis is labelled: every 6 hours for a day or so of readings,
 * every day for longer, or every other day on a narrow screen. The ticks fall
 * on whole UTC hours, so the days start at midnight.
 * @param {[Date, Date]} domain the first and last time on the axis
 * @param {boolean} narrow
 * @returns {Date[]}
 */
function timeTicks([start, end], narrow) {
  const first = start.getTime()
  const last = end.getTime()
  const spanHours = (last - first) / HOUR_MS
  let stepHours = narrow ? NARROW_STEP_HOURS : WIDE_STEP_HOURS
  if (spanHours <= SHORT_SPAN_HOURS) {
    stepHours = SHORT_SPAN_STEP_HOURS
  }

  const step = stepHours * HOUR_MS
  const ticks = []
  for (let time = Math.ceil(first / step) * step; time <= last; time += step) {
    ticks.push(new Date(time))
  }
  return ticks
}

/** Readings with no reading on either side, which no line would show. */
function isolatedPoints(points) {
  const hasReading = (point) => (point?.[1] ?? null) !== null
  return points.filter(
    (point, index) =>
      hasReading(point) &&
      !hasReading(points[index - 1]) &&
      !hasReading(points[index + 1])
  )
}

/**
 * Draws the hourly pollutant readings as one line for each pollutant, from the
 * JSON in the page. The hourly data table beside it is the text equivalent, so
 * the graph stays hidden unless it can be drawn.
 */
class PollutantGraph {
  constructor($module) {
    this.$module = $module
    this.$canvas = $module.querySelector('[data-graph-canvas]')
    this.$data = $module.querySelector('[data-graph-data]')
  }

  init() {
    const data = this.readData()
    if (!data || !this.$canvas) {
      return
    }

    // Shown first, so the canvas can be measured
    this.$module.hidden = false
    try {
      this.draw(data)
    } catch (error) {
      this.$module.hidden = true
      throw error
    }
  }

  readData() {
    try {
      const data = JSON.parse(this.$data?.textContent ?? '')
      return data?.series?.length ? data : null
    } catch {
      return null
    }
  }

  draw(data) {
    const { unit, label, series } = data
    const width = Math.max(this.$canvas.clientWidth || DEFAULT_WIDTH, MIN_WIDTH)
    const plotWidth = width - MARGIN.left - MARGIN.right
    const bottom = HEIGHT - MARGIN.bottom

    const times = series.flatMap(({ points }) => points.map(([time]) => time))
    const values = series.flatMap(({ points }) =>
      points.map(([, value]) => value)
    )
    const x = scaleUtc()
      .domain(extent(times))
      .range([MARGIN.left, width - MARGIN.right])
    const yMax = max(values)
    const y = scaleLinear()
      .domain([0, yMax > 0 ? yMax * Y_HEADROOM : 1])
      .nice()
      .range([bottom, MARGIN.top])

    const svg = select(this.$canvas)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${HEIGHT}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('role', 'img')
      .attr('aria-label', label)

    this.drawGrid(svg, y, plotWidth)
    this.drawTimeAxis(svg, x, width, bottom)
    this.drawValueAxis(svg, y, unit)
    this.drawLines(svg, series, x, y)

    new PollutantGraphTooltip({
      $canvas: this.$canvas,
      svg,
      x,
      y,
      width,
      plot: {
        left: MARGIN.left,
        right: width - MARGIN.right,
        top: MARGIN.top,
        bottom
      },
      data
    }).attach()
  }

  drawGrid(svg, y, plotWidth) {
    svg
      .append('g')
      .attr('class', 'app-pollutant-graph__grid')
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(axisLeft(y).ticks(Y_TICK_COUNT).tickSize(-plotWidth).tickFormat(''))
      .call((group) => group.select('.domain').remove())
  }

  drawTimeAxis(svg, x, width, bottom) {
    const ticks = timeTicks(x.domain(), width < NARROW_WIDTH)

    svg
      .append('g')
      .attr(
        'class',
        'app-pollutant-graph__axis app-pollutant-graph__axis--time'
      )
      .attr('transform', `translate(0,${bottom})`)
      .call(
        axisBottom(x).tickValues(ticks).tickFormat(formatHour).tickSizeOuter(0)
      )
      .call((group) =>
        group.selectAll('.tick text').each((date, index, labels) => {
          // The date goes under the first label and under each midnight
          if (index === 0 || date.getUTCHours() === 0) {
            select(labels[index])
              .append('tspan')
              .attr('x', 0)
              .attr('dy', '1.2em')
              .text(dayMonthFormat.format(date))
          }
        })
      )
  }

  drawValueAxis(svg, y, unit) {
    svg
      .append('g')
      .attr(
        'class',
        'app-pollutant-graph__axis app-pollutant-graph__axis--value'
      )
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(axisLeft(y).ticks(Y_TICK_COUNT))
      .call((group) => group.select('.domain').remove())

    svg
      .append('text')
      .attr('class', 'app-pollutant-graph__axis-title')
      .attr('x', 0)
      .attr('y', AXIS_TITLE_Y)
      .text(unit)
  }

  drawLines(svg, series, x, y) {
    const path = line()
      .defined(([, value]) => value !== null)
      .x(([time]) => x(time))
      .y(([, value]) => y(value))

    series.forEach(({ code, colour, dash, points }) => {
      svg
        .append('path')
        .datum(points)
        .attr('class', 'app-pollutant-graph__line')
        .attr('data-code', code)
        .attr('stroke', colour)
        .attr('stroke-dasharray', dash)
        .attr('d', path)

      svg
        .append('g')
        .selectAll('circle')
        .data(isolatedPoints(points))
        .join('circle')
        .attr('class', 'app-pollutant-graph__point')
        .attr('r', ISOLATED_POINT_RADIUS)
        .attr('fill', colour)
        .attr('cx', ([time]) => x(time))
        .attr('cy', ([, value]) => y(value))
    })
  }
}

export default PollutantGraph
export { formatHour, timeTicks }
