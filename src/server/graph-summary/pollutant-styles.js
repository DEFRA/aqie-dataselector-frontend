/**
 * How each pollutant is drawn in the graph. From the aqie-demo-data-
 * visualisations prototype: a GOV.UK colour paired with a line style, so a
 * pollutant is never told apart by colour alone. `dash` is an SVG
 * stroke-dasharray, or null for a solid line. The keys are aqie-back-end's
 * pollutant codes, in the order the station pages list the pollutants.
 */
const POLLUTANT_STYLES = {
  PM25: { name: 'PM2.5', colour: '#0b0c0c', dash: null },
  PM10: { name: 'PM10', colour: '#28a197', dash: '6,4' },
  NO2: { name: 'Nitrogen dioxide', colour: '#801650', dash: null },
  O3: { name: 'Ozone', colour: '#1d70b8', dash: '1,4' },
  SO2: { name: 'Sulphur dioxide', colour: '#f47738', dash: '10,4,2,4' }
}

export { POLLUTANT_STYLES }
