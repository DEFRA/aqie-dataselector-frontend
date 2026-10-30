import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getNonAurnNetworkIdCsv } from '~/src/server/common/helpers/network-helpers.js'
import {
  invokeStationCount,
  isStationCountError,
  buildUkeapNetworks,
  toAurnNumeric
} from '~/src/server/customdataset/station-count.js'
import { isZoneSelection } from '~/src/server/customdataset/datasource-category.js'
import {
  parseYearRange,
  getPollutantNames
} from '~/src/server/customdataset/selection-helpers.js'

const logger = createLogger()

function isAurnNearRealtimeNetwork(network) {
  const abbreviation = String(network?.abbreviation || '')
    .toUpperCase()
    .trim()
  const combinedName =
    typeof network === 'string'
      ? network
      : `${network?.name || ''} ${network?.fullName || ''}`

  return (
    abbreviation === 'AURN' ||
    /\baurn\b|automatic\s+urban\s+and\s+rural/i.test(combinedName)
  )
}

function getNetworkSelectionName(network) {
  return typeof network === 'string'
    ? network
    : String(network?.name || network?.fullName || '').trim()
}

function getNetworkSelectionPollutantId(network) {
  return typeof network === 'object' && network !== null
    ? String(network.pollutantID || '').trim()
    : ''
}

function getNearRealtimeGroupNetworks(datasourceGroups) {
  const groups = Array.isArray(datasourceGroups) ? datasourceGroups : []
  const nearRealtimeGroup = groups.find(
    (g) => g?.category === 'Near real-time data from Defra'
  )
  return Array.isArray(nearRealtimeGroup?.networks)
    ? nearRealtimeGroup.networks
    : []
}

function getNearRealtimeNetworkSelections(datasourceGroups) {
  const seen = new Set()
  const selections = []

  for (const network of getNearRealtimeGroupNetworks(datasourceGroups)) {
    const name = getNetworkSelectionName(network)
    const pollutantID = getNetworkSelectionPollutantId(network)
    const key = `${name}::${pollutantID}`

    if (name && pollutantID && !seen.has(key)) {
      seen.add(key)
      selections.push({
        name,
        pollutantID,
        isAurn: isAurnNearRealtimeNetwork(network)
      })
    }
  }

  return selections
}

function getSelectedPollutantIds(request) {
  const raw = String(request.yar.get('selectedPollutantID') || '')
  if (!raw) {
    return []
  }

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )
}

async function getAurnFallbackCountByPollutants(baseParams, pollutantIds) {
  if (!Array.isArray(pollutantIds) || pollutantIds.length <= 1) {
    return 0
  }

  const perPollutantCounts = await Promise.all(
    pollutantIds.map(async (pollutantId) => {
      const response = await invokeStationCount({
        ...baseParams,
        pollutantName: pollutantId,
        dataSource: 'AURN',
        networkId: ''
      })

      if (isStationCountError(response)) {
        return 0
      }

      return toAurnNumeric(response)
    })
  )

  return perPollutantCounts.reduce(
    (sum, count) => sum + (Number(count) || 0),
    0
  )
}

async function buildNearRealtimeStationCounts(
  baseParams,
  nearRealtimeSelections
) {
  return Promise.all(
    nearRealtimeSelections.map(async (network) => {
      const networkCount = await invokeStationCount({
        ...baseParams,
        pollutantName: network.pollutantID,
        dataSource: 'AURN',
        networkId: ''
      })

      if (isStationCountError(networkCount)) {
        return {
          ...network,
          count: 0
        }
      }

      return {
        ...network,
        count: toAurnNumeric(networkCount)
      }
    })
  )
}

function buildDatasourceStationCountParams(baseParams, datasourceGroups) {
  return {
    aurnStationCountParams: {
      ...baseParams,
      dataSource: 'AURN',
      networkId: ''
    },
    nonAurnStationCountParams: {
      ...baseParams,
      dataSource: 'NON-AURN',
      networkId: getNonAurnNetworkIdCsv(datasourceGroups)
    }
  }
}

function setStationCountUnavailable(request, aurnCount) {
  logger.error(
    `Station count API failed: ${aurnCount?.message || 'no response'}`
  )
  request.yar.set('stationCountError', true)
  request.yar.set('nooflocation', null)
}

async function resolveAurnDisplayCount(
  baseParams,
  aurnCount,
  selectedPollutantIds
) {
  if (isStationCountError(aurnCount)) {
    const errorFallbackCount = await getAurnFallbackCountByPollutants(
      baseParams,
      selectedPollutantIds
    )

    if (errorFallbackCount > 0) {
      logger.warn(
        `Station count combined AURN failed; using per-pollutant fallback total=${errorFallbackCount}`
      )
      return errorFallbackCount
    }

    return null
  }

  const aurnNumeric = toAurnNumeric(aurnCount)
  if (aurnNumeric !== 0) {
    return aurnNumeric
  }

  const fallbackAurnCount = await getAurnFallbackCountByPollutants(
    baseParams,
    selectedPollutantIds
  )

  return fallbackAurnCount > 0 ? fallbackAurnCount : aurnNumeric
}

function buildStationCountParameters(request, finalyear) {
  const isCountry = request.yar.get('Location') === 'Country'
  const dataSource = request.yar.get('selectedDatasourceType') || 'AURN'
  const pollutantID = request.yar.get('selectedPollutantID')

  if (request.yar.get('Location') === 'Zone') {
    return {
      pollutantName: pollutantID,
      dataSource,
      RegionId: request.yar.get('selectedZoneIDs') || '',
      Region: '',
      regiontype: 'Region',
      Year: finalyear,
      dataselectorfiltertype: 'dataSelectorCount',
      dataselectordownloadtype: ''
    }
  }
  if (request.yar.get('Location') === 'Agglomeration') {
    return {
      pollutantName: pollutantID,
      dataSource,
      RegionId: '',
      Region: '',
      AgglomerationID: request.yar.get('selectedAgglomerationIDs') || '',
      regiontype: 'Agglomeration',
      Year: finalyear,
      dataselectorfiltertype: 'dataSelectorCount',
      dataselectordownloadtype: ''
    }
  }

  if (isCountry) {
    return {
      pollutantName: pollutantID,
      dataSource,
      Region: request.yar.get('selectedlocation').join(','),
      regiontype: 'Country',
      Year: finalyear,
      dataselectorfiltertype: 'dataSelectorCount',
      dataselectordownloadtype: ''
    }
  }

  return {
    pollutantName: pollutantID,
    dataSource,
    Region: request.yar.get('selectedLAIDs'),
    regiontype: 'LocalAuthority',
    Year: finalyear,
    dataselectorfiltertype: 'dataSelectorCount',
    dataselectordownloadtype: ''
  }
}

export async function handleStationCountCalculation(request) {
  const selectedyear = request.yar.get('selectedyear')
  const finalyear = parseYearRange(selectedyear, request)

  const pollutantNames = getPollutantNames()
  const formattedPollutants = request.yar
    .get('selectedpollutant')
    .map((p) => pollutantNames[p] || p)
    .join(',')

  request.yar.set('formattedPollutants', formattedPollutants)
  request.yar.set('finalyear1', finalyear)

  const baseParams = buildStationCountParameters(request, finalyear)
  const datasourceGroups = request.yar.get('datasourceGroups') || []
  const nearRealtimeSelections =
    getNearRealtimeNetworkSelections(datasourceGroups)

  const nearRealtimeStationCounts = await buildNearRealtimeStationCounts(
    baseParams,
    nearRealtimeSelections
  )

  request.yar.set('nearRealtimeStationCounts', nearRealtimeStationCounts)

  const { aurnStationCountParams, nonAurnStationCountParams } =
    buildDatasourceStationCountParams(baseParams, datasourceGroups)

  const [aurnCount, nonAurnCount] = await Promise.all([
    invokeStationCount(aurnStationCountParams),
    invokeStationCount(nonAurnStationCountParams)
  ])

  const selectedPollutantIds = getSelectedPollutantIds(request)
  const aurnDisplayCount = await resolveAurnDisplayCount(
    baseParams,
    aurnCount,
    selectedPollutantIds
  )

  if (aurnDisplayCount == null) {
    setStationCountUnavailable(request, aurnCount)
    return null
  }

  request.yar.set('stationCountError', false)
  request.yar.set('Region', request.yar.get('selectedlocation').join(','))
  request.yar.set('stationCountAURN', aurnDisplayCount)
  request.yar.set('stationCountNONAURN', nonAurnCount)

  const ukeapNetworks = buildUkeapNetworks(nonAurnCount, datasourceGroups)

  if (isZoneSelection(request)) {
    ukeapNetworks.length = 0
  }

  request.yar.set('nooflocationukeap', ukeapNetworks)
  request.yar.set('nooflocation', aurnDisplayCount)

  const nonAurnTotal = ukeapNetworks.reduce(
    (sum, n) => sum + (Number(n.count) || 0),
    0
  )
  if (aurnDisplayCount === 0 && nonAurnTotal === 0) {
    return { bothZero: true }
  }

  return null
}
