import { english } from '~/src/server/data/en/homecontent.js'
import { jsonForScript } from '~/src/server/common/helpers/json-for-script.js'
import { POLLUTANT_STYLES } from '~/src/server/graph-summary/pollutant-styles.js'

const UNIT = 'µg/m³'
const READING_DECIMALS = 10

// UTC, like the readings and the rest of the station pages.
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})
const listFormat = new Intl.ListFormat('en-GB', {
  style: 'long',
  type: 'conjunction'
})

/** [time in ms, reading] pairs, oldest first. No reading is null, not 0. */
function toPoints(readings) {
  return (readings ?? [])
    .map(({ time, value }) => [
      Date.parse(time),
      typeof value === 'number' ? value : null
    ])
    .filter(([time]) => !Number.isNaN(time))
    .sort((a, b) => a[0] - b[0])
}

const formatReading = (value) =>
  String(Math.round(value * READING_DECIMALS) / READING_DECIMALS)

/**
 * The series for the pollutants the station measures that have at least one
 * reading, in the order the station pages list them.
 */
function buildSeries(history, stationPollutants) {
  return Object.entries(POLLUTANT_STYLES)
    .filter(([, { name }]) => stationPollutants.includes(name))
    .map(([code, { name, colour, dash }]) => ({
      code,
      name,
      colour,
      dash,
      points: toPoints(history?.pollutants?.[code])
    }))
    .filter(({ points }) => points.some(([, value]) => value !== null))
}

/** One row for each hour any pollutant has a reading for, oldest first. */
function buildTable(series, content) {
  const times = [
    ...new Set(series.flatMap(({ points }) => points.map(([time]) => time)))
  ].sort((a, b) => a - b)
  const lookups = series.map(
    ({ points }) => new Map(points.map(([time, value]) => [time, value]))
  )

  return {
    title: content.table.title,
    caption: content.table.caption,
    head: [
      { text: content.table.timeHeading },
      ...series.map(({ name }) => ({ text: name, format: 'numeric' }))
    ],
    rows: times.map((time) => [
      { text: timeFormat.format(new Date(time)) },
      ...lookups.map((lookup) => {
        const value = lookup.get(time)
        return {
          text:
            value === null || value === undefined
              ? content.table.noReading
              : formatReading(value),
          format: 'numeric'
        }
      })
    ])
  }
}

/**
 * View model for the "View graph: hourly data" section, built from the raw
 * aqie-back-end history so the graph and the summary share one call. There is
 * no chart or table when the station has no hourly readings to show.
 * @param {object|undefined} history the raw /monitoringStationHistory response
 * @param {string[]} [stationPollutants] display names the station measures
 * @returns {{ heading: string, message: string|null, chart: object|null, table: object|null }}
 */
function buildPollutantGraph(history, stationPollutants = []) {
  const content = english.graphsummary.graph
  const series = buildSeries(history, stationPollutants)

  if (series.length === 0) {
    return {
      heading: content.heading,
      message: content.noData,
      chart: null,
      table: null
    }
  }

  const names = series.map(({ name }) => name)
  const data = {
    unit: UNIT,
    label: `${content.chartLabel} ${listFormat.format(names)}. ${content.chartHint}`,
    keyboardHint: content.keyboardHint,
    verificationStatus: content.verificationStatus,
    noReading: content.table.noReading,
    series
  }

  return {
    heading: content.heading,
    message: null,
    chart: {
      unitText: content.unitText,
      legalLimits: content.legalLimits,
      legendLabel: content.legendLabel,
      legend: series.map(({ name, colour, dash }) => ({ name, colour, dash })),
      dataJson: jsonForScript(data)
    },
    table: buildTable(series, content)
  }
}

export { buildPollutantGraph }
