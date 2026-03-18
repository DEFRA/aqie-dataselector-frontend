/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'

import { catchProxyFetchError } from '~/src/server/common/helpers/catch-proxy-fetch-error.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const LAQM_TIMEOUT_MS = 2500
const LAQM_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const LOCATION_AURN_VIEW = 'location_aurn/index'
const LOCATION_AURN_VIEW_NOJS = 'location_aurn/index_nojs'
const CUSTOMDATASET_URL = '/customdataset'

// Session keys
const SESSION_LOCATION = 'Location'
const SESSION_SELECTED_LOCATION = 'selectedLocation'
const SESSION_SELECTED_LOCATIONS = 'selectedLocations'
const SESSION_SELECTED_COUNTRIES = 'selectedCountries'
const SESSION_SELECTED_LOCATION_LOWER = 'selectedlocation'
const SESSION_SELECTED_LA_IDS = 'selectedLAIDs'

// Form field names and error anchor IDs
const FIELD_LOCAL_AUTHORITY = 'local-authority'
const ANCHOR_MY_AUTOCOMPLETE = '#my-autocomplete'
const ANCHOR_SELECTED_LOCATIONS = '#selected-locations'

function handleLaqmError(statusOrError, laqmCache, logger) {
  const message =
    statusOrError instanceof Error
      ? statusOrError.message
      : statusOrError?.message

  const isTimeout =
    typeof message === 'string' &&
    (message.toLowerCase().includes('aborted') ||
      message.toLowerCase().includes('abort') ||
      message.toLowerCase().includes('timeout'))

  logger.warn(
    `LAQM local authorities request failed${isTimeout ? ' (timeout)' : ''}: ${message}`
  )

  if (laqmCache.value) {
    logger.warn('Using cached LAQM local authorities after failure')
    return laqmCache.value
  }

  return {
    data: [],
    _meta: { unavailable: true, reason: isTimeout ? 'timeout' : 'error' }
  }
}

function handleNon200Status(statuslaqm, laqmCache, logger) {
  logger.warn(`LAQM returned non-200 status: ${statuslaqm}`)
  if (laqmCache.value) {
    logger.warn('Using cached LAQM local authorities after non-200')
    return laqmCache.value
  }
  return { data: [], _meta: { unavailable: true, reason: 'non-200' } }
}

function handleBadPayload(laqmCache, logger) {
  logger.error('LAQM returned an unexpected payload shape')
  if (laqmCache.value) {
    logger.warn('Using cached LAQM local authorities after bad payload')
    return laqmCache.value
  }
  return { data: [], _meta: { unavailable: true, reason: 'bad-payload' } }
}

function determineFormDataFromSession(
  selectedLocation,
  selectedCountries,
  selectedLocalAuthorities,
  selectedlocations
) {
  const formData = {}

  if (selectedLocation === 'Country' && selectedCountries) {
    formData.location = 'countries'
    formData.country = selectedCountries
    return formData
  }

  if (selectedLocation === 'LocalAuthority' && selectedLocalAuthorities) {
    formData.location = 'la'
    formData['selected-locations'] = selectedLocalAuthorities
    return formData
  }

  if (selectedlocations && Array.isArray(selectedlocations)) {
    const countryNames = ['england', 'scotland', 'wales', 'northern ireland']
    const isCountries = selectedlocations.some((loc) =>
      countryNames.includes(loc.toLowerCase())
    )

    formData.location = isCountries ? 'countries' : 'la'
    const key = isCountries ? 'country' : 'selected-locations'
    formData[key] = selectedlocations
  }

  return formData
}

function categorizeLocation(
  location,
  seen,
  duplicates,
  allowedLAs,
  invalidLAs
) {
  const trimmed = location.trim()
  const lower = trimmed.toLowerCase()
  if (seen.has(lower)) {
    duplicates.add(trimmed)
  } else {
    seen.add(lower)
  }
  if (!allowedLAs.has(lower)) {
    invalidLAs.push(trimmed)
  }
}

function validateSelectedLocations(
  selectedLocations,
  localAuthorityNames,
  errors
) {
  const allowedLAs = new Set(
    localAuthorityNames.map((name) => name.toLowerCase().trim())
  )
  const invalidLAs = []
  const duplicates = new Set()
  const seen = new Set()

  for (const location of selectedLocations) {
    categorizeLocation(location, seen, duplicates, allowedLAs, invalidLAs)
  }

  if (selectedLocations.length > 10) {
    errors.list.push({
      text: 'You can only select up to 10 local authorities',
      href: ANCHOR_MY_AUTOCOMPLETE
    })
    errors.details[FIELD_LOCAL_AUTHORITY] =
      'You can only select up to 10 local authorities'
  }

  if (invalidLAs.length > 0) {
    errors.list.push({
      text: 'Select local authorities from the list',
      href: ANCHOR_MY_AUTOCOMPLETE
    })
    errors.details[FIELD_LOCAL_AUTHORITY] =
      'Select local authorities from the list'
  }

  if (duplicates.size > 0) {
    errors.list.push({
      text: 'Remove duplicate local authorities',
      href: ANCHOR_MY_AUTOCOMPLETE
    })
    errors.details[FIELD_LOCAL_AUTHORITY] = 'Remove duplicate local authorities'
  }

  return { seen, hasErrors: errors.list.length > 0 }
}

function getCleanedLocations(seen, localAuthorityNames, selectedLocations) {
  return Array.from(seen).map((lower) => {
    return (
      localAuthorityNames.find((name) => name.toLowerCase().trim() === lower) ||
      selectedLocations.find((loc) => loc.toLowerCase().trim() === lower)
    )
  })
}

function mapLocalAuthorityIDs(selectedLocations, laResult) {
  const selectedLAIDs = []
  if (!laResult?.data || !Array.isArray(laResult.data)) {
    return selectedLAIDs
  }

  selectedLocations.forEach((selectedName) => {
    const matchedLA = laResult.data.find(
      (item) =>
        item['Local Authority Name'] &&
        item['Local Authority Name'].toLowerCase().trim() ===
          selectedName.toLowerCase().trim()
    )
    if (matchedLA?.['LA ID']) {
      selectedLAIDs.push(matchedLA['LA ID'])
    }
  })

  return selectedLAIDs
}

function buildViewContext(
  request,
  laResult,
  localAuthorityNames,
  laqmUnavailable,
  laqmUnavailableReason,
  backUrl,
  formData = null,
  errors = null
) {
  const context = {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    displayBacklink: true,
    hrefq: backUrl,
    laResult,
    localAuthorityNames,
    laqmUnavailable,
    laqmUnavailableReason
  }
  if (formData) {
    context.formData = formData
  }
  if (errors) {
    context.errors = errors
  }
  return context
}

function isNoJsRequest(request) {
  return (
    request.query?.nojs === 'true' ||
    request.path?.includes('nojs') ||
    request.headers['user-agent']?.toLowerCase().includes('noscript')
  )
}

function getTemplatePath(isNoJs) {
  return isNoJs ? LOCATION_AURN_VIEW_NOJS : LOCATION_AURN_VIEW
}

function handleGetRequest(
  request,
  h,
  laResult,
  localAuthorityNames,
  laqmUnavailable,
  laqmUnavailableReason,
  backUrl
) {
  const selectedLocation = request.yar.get(SESSION_LOCATION)
  const selectedCountries = request.yar.get(SESSION_SELECTED_COUNTRIES)
  const selectedlocations = request.yar.get(SESSION_SELECTED_LOCATION_LOWER)
  const selectedLocalAuthorities = request.yar.get(SESSION_SELECTED_LOCATIONS)

  const formData = determineFormDataFromSession(
    selectedLocation,
    selectedCountries,
    selectedLocalAuthorities,
    selectedlocations
  )
  const isNoJs = isNoJsRequest(request)
  const templatePath = getTemplatePath(isNoJs)

  return h.view(
    templatePath,
    buildViewContext(
      request,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      formData
    )
  )
}

function validateLocationRadio(payload, errors) {
  if (!payload.location) {
    errors.list.push({
      text: 'Select an option before continuing',
      href: '#location-2'
    })
    errors.details.location = 'Select an option before continuing'
    return false
  }
  return true
}

function validateCountries(payload, errors) {
  if (
    !payload.country ||
    (Array.isArray(payload.country) && payload.country.length === 0)
  ) {
    errors.list.push({
      text: 'Select at least one country',
      href: '#country-england'
    })
    errors.details.country = 'Select at least one country'
    return false
  }
  return true
}

function validateLocalAuthorityAvailability(localAuthorityNames, errors) {
  if (localAuthorityNames.length === 0) {
    errors.list.push({
      text: 'Local authorities are currently unavailable. Try again later.',
      href: '#location-4'
    })
    errors.details[FIELD_LOCAL_AUTHORITY] =
      'Local authorities are currently unavailable. Try again later.'
    return false
  }
  return true
}

function extractFromTableLocations(payload) {
  if (!payload['selected-locations']) {
    return []
  }
  if (Array.isArray(payload['selected-locations'])) {
    return payload['selected-locations'].filter((loc) => loc?.trim())
  }
  return [payload['selected-locations']].filter((loc) => loc?.trim())
}

function extractFromAutocomplete(payload) {
  const singleLocation = payload['local-authority-autocomplete']?.trim()
  return singleLocation ? [singleLocation] : []
}

function extractSelectedLocations(payload) {
  const tableLocations = extractFromTableLocations(payload)
  if (tableLocations.length > 0) {
    return tableLocations
  }
  return extractFromAutocomplete(payload)
}

function validateLocalAuthorities(
  selectedLocations,
  localAuthorityNames,
  errors,
  isNoJs
) {
  if (selectedLocations.length === 0) {
    errors.list.push({
      text: 'Add at least one local authority',
      href: isNoJs ? ANCHOR_SELECTED_LOCATIONS : ANCHOR_MY_AUTOCOMPLETE
    })
    errors.details[FIELD_LOCAL_AUTHORITY] = 'Add at least one local authority'
    return { seen: new Set(), hasErrors: true }
  }

  return validateSelectedLocations(
    selectedLocations,
    localAuthorityNames,
    errors
  )
}

function handlePostCountries(payload, request) {
  const selectedCountries = Array.isArray(payload.country)
    ? payload.country
    : [payload.country]
  request.yar.set(SESSION_SELECTED_COUNTRIES, selectedCountries)
  request.yar.set(
    SESSION_SELECTED_LOCATION,
    'Countries: ' + selectedCountries.join(', ')
  )
  request.yar.set(SESSION_LOCATION, 'Country')
  request.yar.set(SESSION_SELECTED_LOCATION_LOWER, selectedCountries)
}

function handlePostLocalAuthorities(payload, request, laResult) {
  const selectedLocations = payload.selectedLocations
  const selectedLAIDs = mapLocalAuthorityIDs(selectedLocations, laResult)

  request.yar.set(SESSION_SELECTED_LOCATIONS, selectedLocations)
  request.yar.set(
    SESSION_SELECTED_LOCATION,
    'Local Authorities: ' + selectedLocations.join(', ')
  )
  request.yar.set(SESSION_SELECTED_LA_IDS, selectedLAIDs.join(','))
  request.yar.set(SESSION_LOCATION, 'LocalAuthority')
  request.yar.set(SESSION_SELECTED_LOCATION_LOWER, selectedLocations)
}

function handlePostValidationError(
  request,
  h,
  payload,
  laResult,
  localAuthorityNames,
  laqmUnavailable,
  laqmUnavailableReason,
  backUrl,
  errors
) {
  const isNoJs = isNoJsRequest(request)
  const templatePath = getTemplatePath(isNoJs)
  return h.view(
    templatePath,
    buildViewContext(
      request,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      payload,
      errors
    )
  )
}

function processCountriesPost(
  payload,
  request,
  h,
  laResult,
  localAuthorityNames,
  laqmUnavailable,
  laqmUnavailableReason,
  backUrl,
  errors
) {
  if (!validateCountries(payload, errors)) {
    return handlePostValidationError(
      request,
      h,
      payload,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      errors
    )
  }
  handlePostCountries(payload, request)
  return h.redirect(backUrl)
}

function processLocalAuthoritiesPost(
  payload,
  request,
  h,
  laResult,
  localAuthorityNames,
  laqmUnavailable,
  laqmUnavailableReason,
  backUrl,
  errors
) {
  if (!validateLocalAuthorityAvailability(localAuthorityNames, errors)) {
    return handlePostValidationError(
      request,
      h,
      payload,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      errors
    )
  }
  const isNoJs = isNoJsRequest(request)
  const selectedLocations = extractSelectedLocations(payload)
  const { seen, hasErrors } = validateLocalAuthorities(
    selectedLocations,
    localAuthorityNames,
    errors,
    isNoJs
  )
  if (hasErrors) {
    return handlePostValidationError(
      request,
      h,
      payload,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      errors
    )
  }
  payload.selectedLocations = getCleanedLocations(
    seen,
    localAuthorityNames,
    selectedLocations
  )
  handlePostLocalAuthorities(payload, request, laResult)
  return h.redirect(backUrl)
}

function handlePostRequest(
  request,
  h,
  payload,
  laResult,
  localAuthorityNames,
  laqmUnavailable,
  laqmUnavailableReason,
  backUrl
) {
  const errors = { list: [], details: {} }

  if (!validateLocationRadio(payload, errors)) {
    return handlePostValidationError(
      request,
      h,
      payload,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      errors
    )
  }

  if (payload.location === 'countries') {
    return processCountriesPost(
      payload,
      request,
      h,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      errors
    )
  }

  if (payload.location === 'la') {
    return processLocalAuthoritiesPost(
      payload,
      request,
      h,
      laResult,
      localAuthorityNames,
      laqmUnavailable,
      laqmUnavailableReason,
      backUrl,
      errors
    )
  }

  errors.list.push({
    text: 'Select a valid location type',
    href: '#location-2'
  })
  errors.details.location = 'Select a valid location type'
  return handlePostValidationError(
    request,
    h,
    payload,
    laResult,
    localAuthorityNames,
    laqmUnavailable,
    laqmUnavailableReason,
    backUrl,
    errors
  )
}

function getLocalAuthorityNames(laResult) {
  if (laResult?.data && Array.isArray(laResult.data)) {
    return laResult.data
      .map((item) => item['Local Authority Name'])
      .filter((name) => name)
  }
  return []
}

let laqmCache = {
  value: /** @type {any} */ (null),
  expiresAt: 0
}

async function fetchWithTimeout(laqmurl, optionslaqm) {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    try {
      abortController.abort()
    } catch {
      // ignore
    }
  }, LAQM_TIMEOUT_MS)

  const result = await catchProxyFetchError(laqmurl, {
    ...optionslaqm,
    signal: abortController.signal
  })
  clearTimeout(timeoutId)
  return result
}

function parseLaqmResult(result) {
  const [statusOrError, responselaqm] = Array.isArray(result)
    ? result
    : [new Error('Invalid response from catchProxyFetchError')]

  if (
    statusOrError instanceof Error ||
    (typeof statusOrError === 'object' && statusOrError?.message)
  ) {
    return { error: statusOrError }
  }

  if (statusOrError !== 200) {
    return { status: statusOrError }
  }

  if (!responselaqm || typeof responselaqm !== 'object') {
    return { badPayload: true }
  }

  const count = Array.isArray(responselaqm.data) ? responselaqm.data.length : 0
  logger.info(`LAQM local authorities received: ${count}`)

  return { response: responselaqm }
}

async function Invokelocalauthority() {
  const laqmurl = 'https://www.laqmportal.co.uk/xapi/getLocalAuthorities/json'
  const apiKey = config.get('laqmAPIkey')
  const partnerId = config.get('laqmAPIPartnerId')

  if (laqmCache.value && Date.now() < laqmCache.expiresAt) {
    return laqmCache.value
  }

  if (!apiKey || !partnerId) {
    logger.error('Missing LAQM API credentials (laqmAPIkey / laqmAPIPartnerId)')
    return { data: [] }
  }

  const optionslaqm = {
    method: 'get',
    headers: {
      'Content-Type': 'text/json',
      preserveWhitespace: true,
      'X-API-Key': apiKey,
      'X-API-PartnerId': partnerId
    }
  }

  const result = await fetchWithTimeout(laqmurl, optionslaqm)
  const parsed = parseLaqmResult(result)

  if (parsed.error) {
    return handleLaqmError(parsed.error, laqmCache, logger)
  }
  if (parsed.status) {
    return handleNon200Status(parsed.status, laqmCache, logger)
  }
  if (parsed.badPayload) {
    return handleBadPayload(laqmCache, logger)
  }

  laqmCache = {
    value: parsed.response,
    expiresAt: Date.now() + LAQM_CACHE_TTL_MS
  }

  return parsed.response
}

export const locationaurnController = {
  handler: async (request, h) => {
    const backUrl = CUSTOMDATASET_URL

    if (request.method === 'get') {
      request.yar.set('searchQuery', null)
      request.yar.set('fullSearchQuery', null)
      request.yar.set('osnameapiresult', '')
    }

    const laResult = await Invokelocalauthority()
    const localAuthorityNames = getLocalAuthorityNames(laResult)
    const laqmUnavailable = Boolean(laResult?._meta?.unavailable)
    const laqmUnavailableReason = laResult?._meta?.reason

    if (request.method === 'get') {
      return handleGetRequest(
        request,
        h,
        laResult,
        localAuthorityNames,
        laqmUnavailable,
        laqmUnavailableReason,
        backUrl
      )
    }

    if (request.method === 'post') {
      return handlePostRequest(
        request,
        h,
        request.payload,
        laResult,
        localAuthorityNames,
        laqmUnavailable,
        laqmUnavailableReason,
        backUrl
      )
    }

    const isNoJs = isNoJsRequest(request)
    const templatePath = getTemplatePath(isNoJs)
    return h.view(
      templatePath,
      buildViewContext(
        request,
        laResult,
        localAuthorityNames,
        laqmUnavailable,
        laqmUnavailableReason,
        backUrl
      )
    )
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
