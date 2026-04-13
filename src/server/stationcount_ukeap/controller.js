import Wreck from '@hapi/wreck'

const API_URL =
  'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/aqie-historicaldata-backend/AtomDataSelection'
const API_KEY = 'OcqbieDCvF8uvpu4TWKONUtBYQ0eBLpA'

async function invokeUKEAPStationCount(params) {
  try {
    const { payload } = await Wreck.post(API_URL, {
      payload: JSON.stringify(params),
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      json: true
    })
    return payload
  } catch (error) {
    return error
  }
}

function parseYearRange(selectedyear) {
  const years = selectedyear?.match(/\d{4}/g)
  if (years?.length === 2) {
    const start = Number.parseInt(years[0], 10)
    const end = Number.parseInt(years[1], 10)
    const list = []
    for (let y = start; y <= end; y++) list.push(y)
    return list.join(',')
  }
  if (years?.length === 1) return years[0]
  return ''
}

export const stationcountUkeapController = {
  handler: async (request, h) => {
    const selectedyear = request.yar.get('selectedyear')
    const finalyear = parseYearRange(selectedyear)
    const isCountry = request.yar.get('Location') === 'Country'

    const params = {
      pollutantName: 'Nitrogen dioxide',
      dataSource: 'UKEAP',
      Region: isCountry
        ? request.yar.get('selectedlocation')?.join(',')
        : request.yar.get('selectedLAIDs'),
      regiontype: isCountry ? 'Country' : 'LocalAuthority',
      Year: finalyear,
      dataselectorfiltertype: 'dataSelectorCount',
      dataselectordownloadtype: ''
    }

    const result = await invokeUKEAPStationCount(params)

    if (
      result == null ||
      result instanceof Error ||
      result?.isAxiosError ||
      (typeof result === 'object' && result?.message)
    ) {
      return h.response({ error: true, stationcount: 0 }).code(200)
    }

    request.yar.set('nooflocationukeap', result)
    return h.response({ stationcount: result }).code(200)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
