/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import axios from 'axios'
import Wreck from '@hapi/wreck'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { getNonAurnNetworkIdCsv } from '~/src/server/common/helpers/network-helpers.js'
import {
  isInternalNavigation,
  renderNotFound
} from '~/src/server/common/helpers/navigation-helpers.js'

const logger = createLogger()

const PROBLEM_WITH_SERVICE = '/problem-with-service'

const EMAIL_REQUEST_VIEW = 'emailrequest/index'

// A response is invalid if it is empty or an XML error document
function isInvalidEmailResponse(data) {
  return !data || (typeof data === 'string' && data.includes('<?xml'))
}

async function invokeEmailRequestDev(emailRequestParameters) {
  try {
    const url = config.get('emailDevUrl')
    const { payload } = await Wreck.post(url, {
      payload: JSON.stringify(emailRequestParameters),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.get('osNamesDevApiKey')
      },
      json: true
    })
    if (isInvalidEmailResponse(payload)) {
      logger.error('Email request API returned invalid response (XML or empty)')
      return { error: true }
    }
    return payload
  } catch (error) {
    logger.error(
      `Email request API error (local): ${error instanceof Error ? error.message : 'unknown error'}`
    )
    return { error: true }
  }
}

async function invokeEmailRequestProd(emailRequestParameters) {
  try {
    const response = await axios.post(
      config.get('email_URL'),
      emailRequestParameters
    )
    if (isInvalidEmailResponse(response.data)) {
      logger.error('Email request API returned invalid response (XML or empty)')
      return { error: true }
    }
    return response.data
  } catch (error) {
    logger.error(
      `Email request API error: ${error instanceof Error ? error.message : 'unknown error'}`
    )
    return { error: true }
  }
}

async function invokeEmailRequest(emailRequestParameters) {
  return config.get('isDevelopment')
    ? invokeEmailRequestDev(emailRequestParameters)
    : invokeEmailRequestProd(emailRequestParameters)
}
const REQUIRED_PARAMS = [
  'pollutantName',
  'Region',
  'regiontype',
  'Year',
  'email'
]

// Basic email validation
const isValidEmail = (emailAddress) => {
  if (!emailAddress || typeof emailAddress !== 'string') {
    return false
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(emailAddress.trim())
}

// Render the email request form, optionally with an error/preserved value.
const renderEmailForm = (h, backUrl, extra = {}) =>
  h.view(EMAIL_REQUEST_VIEW, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    displayBacklink: true,
    hrefq: backUrl,
    ...extra
  })

// Determine back URL: JS download page if arriving from it, else the no-JS page.
const computeBackUrl = (dataSourceParam, referrer) => {
  const isFromJsPage =
    dataSourceParam ||
    (referrer.includes('/download_dataselector') && !referrer.includes('nojs'))
  return isFromJsPage ? '/download_dataselector' : '/download_dataselectornojs'
}

const getTrimmedQueryValue = (request, key) =>
  (request.query?.[key] || '').toString().trim()

const isSupportedDataSource = (dataSourceParam) =>
  dataSourceParam === 'AURN' || dataSourceParam === 'NON-AURN'

const persistPendingNetworkId = (request) => {
  const requestedNetworkId = getTrimmedQueryValue(request, 'networkId')
  if (requestedNetworkId) {
    request.yar.set('pendingNetworkId', requestedNetworkId)
    return
  }

  const datasourceGroups = request.yar.get('datasourceGroups') || []
  const derivedNetworkId = getNonAurnNetworkIdCsv(datasourceGroups)
  if (derivedNetworkId) {
    request.yar.set('pendingNetworkId', derivedNetworkId)
  }
}

// Persist the dataSource path param (and derived network id) so it survives POST.
const storePendingDataSource = (request, dataSourceParam) => {
  if (isSupportedDataSource(dataSourceParam)) {
    request.yar.set('pendingDataSource', dataSourceParam)
  }

  const requestedPollutantID = getTrimmedQueryValue(request, 'pollutantID')
  if (requestedPollutantID) {
    request.yar.set('pendingPollutantID', requestedPollutantID)
  }

  if (dataSourceParam === 'NON-AURN') {
    persistPendingNetworkId(request)
  }
}

const toSinglePollutantID = (selectedPollutantID) => {
  if (selectedPollutantID == null) {
    return selectedPollutantID
  }

  const value = String(selectedPollutantID)
  const first = value
    .split(',')
    .map((id) => id.trim())
    .find(Boolean)

  return first || ''
}

// Decides whether a network entry matches the current request context.
const isMatchingNetwork = (network, dataSource, networkId) => {
  if (dataSource === 'NON-AURN') {
    return Boolean(networkId) && String(network.id) === String(networkId)
  }

  return dataSource === 'AURN' && !network.id && Boolean(network.pollutantID)
}

// Resolve a pollutant id specific to the selected network/data source.
const getPollutantIDForNetwork = (datasourceGroups, dataSource, networkId) => {
  if (!Array.isArray(datasourceGroups) || datasourceGroups.length === 0) {
    return null
  }

  for (const group of datasourceGroups) {
    for (const network of group.networks || []) {
      if (isMatchingNetwork(network, dataSource, networkId)) {
        return network.pollutantID || null
      }
    }
  }

  return null
}

// Build the station count parameters from session, applying any pending dataSource.
const buildStationCountParameters = (request) => {
  const dataSourceFromQuery = request.yar.get('pendingDataSource')
  if (dataSourceFromQuery) {
    request.yar.set('selectedDatasourceType', dataSourceFromQuery)
    request.yar.clear('pendingDataSource')
  }

  const selectedDataSource = request.yar.get('selectedDatasourceType') || 'AURN'
  const pendingNetworkId = (request.yar.get('pendingNetworkId') || '')
    .toString()
    .trim()
  const pendingPollutantID = (request.yar.get('pendingPollutantID') || '')
    .toString()
    .trim()
  const datasourceGroups = request.yar.get('datasourceGroups') || []
  const networkPollutantID = getPollutantIDForNetwork(
    datasourceGroups,
    selectedDataSource,
    pendingNetworkId
  )
  const selectedPollutantID = request.yar.get('selectedPollutantID')
  const regionType = request.yar.get('Location')
  const selectedLocations = request.yar.get('selectedlocation')
  let regionValue = request.yar.get('selectedLAIDs')
  if (regionType === 'Country') {
    regionValue = Array.isArray(selectedLocations)
      ? selectedLocations.join(',')
      : ''
  }

  const params = {
    pollutantName:
      pendingPollutantID ||
      networkPollutantID ||
      toSinglePollutantID(selectedPollutantID),
    dataSource: selectedDataSource,
    networkId: selectedDataSource === 'NON-AURN' ? pendingNetworkId : '',
    Region: regionValue,
    regiontype: regionType,
    Year: request.yar.get('finalyear1'),
    dataselectorfiltertype: 'dataSelectorHourly',
    dataselectordownloadtype: 'dataSelectorMultiple',
    email: request.yar.get('email')
  }
  request.yar.clear('pendingPollutantID')
  request.yar.clear('pendingNetworkId')
  return params
}

const hasMissingRequiredParams = (params) =>
  REQUIRED_PARAMS.some((param) => {
    const value = params[param]
    return value === null || value === undefined || value === ''
  })

const isEmailApiError = (result) =>
  !result ||
  result.error === true ||
  (typeof result === 'string' && result.includes('<?xml'))

// Handle the POST /confirm flow: validate email, build params, call the API.
const handleConfirm = async (request, h, backUrl) => {
  const email = request.payload?.email
  request.yar.set('email', email)

  if (!email) {
    return renderEmailForm(h, backUrl, {
      error: 'Enter an email address',
      email
    })
  }

  if (!isValidEmail(email)) {
    return renderEmailForm(h, backUrl, {
      error: 'Enter a valid email address',
      email
    })
  }

  const stationcountparameters = buildStationCountParameters(request)

  if (hasMissingRequiredParams(stationcountparameters)) {
    logger.error('Email request failed - missing required parameters')
    return h.redirect(PROBLEM_WITH_SERVICE)
  }

  const result = await invokeEmailRequest(stationcountparameters)

  if (isEmailApiError(result)) {
    logger.error('Email request failed - redirecting to problem-with-service')
    return h.redirect(PROBLEM_WITH_SERVICE)
  }

  if (result === 'Success') {
    return h.view('emailrequest/requestconfirm.njk', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts
    })
  }

  // Redirect to existing problem with service page when API call fails
  return h.redirect(PROBLEM_WITH_SERVICE)
}

export const emailrequestController = {
  handler: async (request, h) => {
    // If accessed directly (no valid referer), return 404 page not found
    if (!isInternalNavigation(request)) {
      return renderNotFound(h)
    }

    const dataSourceParam = request.params?.dataSource
    const referrer = request.info?.referrer || ''
    const backUrl = computeBackUrl(dataSourceParam, referrer)

    storePendingDataSource(request, dataSourceParam)

    if (request.path?.includes('/confirm')) {
      return handleConfirm(request, h, backUrl)
    }

    return renderEmailForm(h, backUrl)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
