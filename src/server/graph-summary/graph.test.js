import { buildPollutantGraph } from '~/src/server/graph-summary/graph.js'

const hour = (h) => `2026-11-03T${String(h).padStart(2, '0')}:00:00.000Z`
const reading = (h, value) => ({ time: hour(h), value })

const HISTORY = {
  pollutants: {
    PM25: [reading(10, 5.24), reading(11, null), reading(12, 7)],
    PM10: [reading(10, 11), reading(11, 12), reading(12, 13)],
    NO2: [],
    O3: [reading(10, null), reading(11, null)],
    SO2: [reading(10, 1), reading(11, 1), reading(12, 1)]
  }
}
// The station does not measure sulphur dioxide.
const STATION_POLLUTANTS = ['PM2.5', 'PM10', 'Nitrogen dioxide', 'Ozone']

const readData = (graph) => JSON.parse(graph.chart.dataJson)

describe('buildPollutantGraph', () => {
  it('has the section heading and the texts above and below the graph', () => {
    const graph = buildPollutantGraph(HISTORY, STATION_POLLUTANTS)

    expect(graph.heading).toBe('View graph: hourly data')
    expect(graph.message).toBeNull()
    expect(graph.chart).toEqual(
      expect.objectContaining({
        unitText:
          'The unit µg/m³ stands for micrograms (one millionth of a gram) per cubic metre of air.',
        legalLimits: 'Pollution levels are measured against UK legal limits.',
        legendLabel: 'Pollutants in the graph'
      })
    )
  })

  describe('which pollutants are drawn', () => {
    it('is each pollutant the station measures that has a reading, in the station page order', () => {
      const graph = buildPollutantGraph(HISTORY, STATION_POLLUTANTS)

      expect(graph.chart.legend.map(({ name }) => name)).toEqual([
        'PM2.5',
        'PM10'
      ])
    })

    it('leaves out a pollutant with no readings at all', () => {
      const graph = buildPollutantGraph(HISTORY, STATION_POLLUTANTS)

      const names = readData(graph).series.map(({ name }) => name)
      expect(names).not.toContain('Nitrogen dioxide')
      expect(names).not.toContain('Ozone')
    })

    it('leaves out a pollutant the station does not measure', () => {
      const graph = buildPollutantGraph(HISTORY, STATION_POLLUTANTS)

      expect(readData(graph).series.map(({ code }) => code)).not.toContain(
        'SO2'
      )
    })
  })

  describe('how each pollutant is drawn', () => {
    it('gives each pollutant its colour and line style, for the legend', () => {
      const graph = buildPollutantGraph(HISTORY, STATION_POLLUTANTS)

      expect(graph.chart.legend).toEqual([
        { name: 'PM2.5', colour: '#0b0c0c', dash: null },
        { name: 'PM10', colour: '#28a197', dash: '6,4' }
      ])
    })

    it('uses a different colour and line style for each of the five pollutants', () => {
      const all = {
        pollutants: Object.fromEntries(
          ['PM25', 'PM10', 'NO2', 'O3', 'SO2'].map((code) => [
            code,
            [reading(10, 1)]
          ])
        )
      }

      const { legend } = buildPollutantGraph(all, [
        'PM2.5',
        'PM10',
        'Nitrogen dioxide',
        'Ozone',
        'Sulphur dioxide'
      ]).chart

      expect(new Set(legend.map(({ colour }) => colour)).size).toBe(5)
      expect(new Set(legend.map(({ dash }) => dash)).size).toBeGreaterThan(1)
    })
  })

  describe('the data for the graph script', () => {
    it('has the unit, an accessible description and each series', () => {
      const data = readData(buildPollutantGraph(HISTORY, STATION_POLLUTANTS))

      expect(data.unit).toBe('µg/m³')
      expect(data.label).toBe(
        'Line chart of hourly readings in µg/m³ for PM2.5 and PM10. The same readings are in the table below the graph.'
      )
      expect(data.series.map(({ code }) => code)).toEqual(['PM25', 'PM10'])
    })

    it('has the texts the tooltip and keyboard users need', () => {
      const data = readData(buildPollutantGraph(HISTORY, STATION_POLLUTANTS))

      expect(data.verificationStatus).toBe('Unverified')
      expect(data.noReading).toBe('No data')
      expect(data.keyboardHint).toBe(
        'Use the left and right arrow keys to move between hours.'
      )
    })

    it('has [time in ms, reading] points, oldest first, keeping a missing reading as null', () => {
      const data = readData(buildPollutantGraph(HISTORY, STATION_POLLUTANTS))

      expect(data.series[0].points).toEqual([
        [Date.parse(hour(10)), 5.24],
        [Date.parse(hour(11)), null],
        [Date.parse(hour(12)), 7]
      ])
    })

    it('sorts the points and drops readings with no usable time', () => {
      const unordered = {
        pollutants: {
          PM25: [
            reading(12, 3),
            { time: 'not a time', value: 9 },
            reading(10, 1)
          ]
        }
      }

      const data = readData(buildPollutantGraph(unordered, ['PM2.5']))

      expect(data.series[0].points).toEqual([
        [Date.parse(hour(10)), 1],
        [Date.parse(hour(12)), 3]
      ])
    })

    it('treats a reading that is not a number as missing', () => {
      const odd = { pollutants: { PM25: [reading(10, '5'), reading(11, 2)] } }

      const data = readData(buildPollutantGraph(odd, ['PM2.5']))

      expect(data.series[0].points[0][1]).toBeNull()
    })

    it('can be put inside a script element', () => {
      const { dataJson } = buildPollutantGraph(
        HISTORY,
        STATION_POLLUTANTS
      ).chart

      expect(dataJson).not.toMatch(/[<>&]/)
    })
  })

  describe('the hourly data table', () => {
    const table = () => buildPollutantGraph(HISTORY, STATION_POLLUTANTS).table

    it('has a title, a caption with the unit, and a column for the time and each pollutant', () => {
      expect(table().title).toBe('View hourly data as a table')
      expect(table().caption).toBe('Hourly readings in µg/m³')
      expect(table().head).toEqual([
        { text: 'Time (UTC)' },
        { text: 'PM2.5', format: 'numeric' },
        { text: 'PM10', format: 'numeric' }
      ])
    })

    it('has a row for each hour, oldest first, with the time in UTC', () => {
      expect(table().rows.map(([time]) => time.text)).toEqual([
        '10:00, 3 Nov 2026',
        '11:00, 3 Nov 2026',
        '12:00, 3 Nov 2026'
      ])
    })

    it('shows each reading to one decimal place, and "No data" for a missing one', () => {
      expect(table().rows[0].slice(1)).toEqual([
        { text: '5.2', format: 'numeric' },
        { text: '11', format: 'numeric' }
      ])
      expect(table().rows[1][1]).toEqual({ text: 'No data', format: 'numeric' })
    })

    it('shows "No data" for an hour a pollutant has no row for', () => {
      const gappy = {
        pollutants: {
          PM25: [reading(10, 1), reading(11, 2)],
          PM10: [reading(11, 3)]
        }
      }

      const { rows } = buildPollutantGraph(gappy, ['PM2.5', 'PM10']).table

      expect(rows[0][2].text).toBe('No data')
      expect(rows[1][2].text).toBe('3')
    })
  })

  describe('when there is nothing to draw', () => {
    it.each([
      ['no history', undefined, STATION_POLLUTANTS],
      ['an empty history', {}, STATION_POLLUTANTS],
      ['a station that measures nothing', HISTORY, []],
      ['a station with no pollutant list', HISTORY, undefined],
      [
        'only missing readings',
        { pollutants: { PM25: [reading(10, null)] } },
        ['PM2.5']
      ]
    ])(
      'has a message and no chart or table for %s',
      (_name, history, names) => {
        expect(buildPollutantGraph(history, names)).toEqual({
          heading: 'View graph: hourly data',
          message: 'There are no hourly readings to show for this period.',
          chart: null,
          table: null
        })
      }
    )
  })
})
