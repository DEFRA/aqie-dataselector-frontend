// Pollutant keys returned by monitoring station APIs mapped to display names.
const POLLUTANT_ALIASES = {
  PM25: 'PM2.5',
  GR25: 'PM2.5',
  MP10: 'PM10',
  GE10: 'PM10',
  GR10: 'PM10'
}

/** Maps each station name to its de-duplicated list of pollutant names. */
function buildPollutantMap(monitoringStations) {
  if (!Array.isArray(monitoringStations)) {
    return new Map()
  }

  return new Map(
    monitoringStations.map((station) => [
      station.name,
      [
        ...new Set(
          Object.keys(station.pollutants || {}).map(
            (key) => POLLUTANT_ALIASES[key] ?? key
          )
        )
      ]
    ])
  )
}

export { POLLUTANT_ALIASES, buildPollutantMap }
