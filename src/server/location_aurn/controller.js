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

let laqmCache = {
  value: /** @type {any} */ (null),
  expiresAt: 0
}

export const locationaurnController = {
  handler: async (request, h) => {
    const backUrl = '/customdataset'
    // const logger = createLogger()
    // DON'T clear session data - preserve previous selections for "change" functionality
    // Only clear specific search-related temporary data
    if (request.method === 'get') {
      request.yar.set('searchQuery', null)
      request.yar.set('fullSearchQuery', null)
      request.yar.set('osnameapiresult', '')
      // Keep selectedLocation, selectedLocations, selectedCountries, etc. for pre-population
    }

    async function Invokelocalauthority() {
      const laqmurl =
        'https://www.laqmportal.co.uk/xapi/getLocalAuthorities/json'
      const apiKey = config.get('laqmAPIkey')
      const partnerId = config.get('laqmAPIPartnerId')

      if (laqmCache.value && Date.now() < laqmCache.expiresAt) {
        return laqmCache.value
      }

      if (!apiKey || !partnerId) {
        logger.error(
          'Missing LAQM API credentials (laqmAPIkey / laqmAPIPartnerId)'
        )
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
      const [statusOrError, responselaqm] = Array.isArray(result)
        ? result
        : [new Error('Invalid response from catchProxyFetchError')]

      if (
        statusOrError instanceof Error ||
        (typeof statusOrError === 'object' && statusOrError?.message)
      ) {
        return handleLaqmError(statusOrError, laqmCache, logger)
      }

      const statuslaqm = statusOrError
      if (statuslaqm !== 200) {
        return handleNon200Status(statuslaqm, laqmCache, logger)
      }

      if (!responselaqm || typeof responselaqm !== 'object') {
        return handleBadPayload(laqmCache, logger)
      }

      const count = Array.isArray(responselaqm.data)
        ? responselaqm.data.length
        : 0
      logger.info(`LAQM local authorities received: ${count}`)

      laqmCache = {
        value: responselaqm,
        expiresAt: Date.now() + LAQM_CACHE_TTL_MS
      }

      return responselaqm
    }
    const laResult = await Invokelocalauthority()

    let localAuthorityNames = []
    if (laResult?.data && Array.isArray(laResult.data)) {
      localAuthorityNames = laResult.data
        .map((item) => item['Local Authority Name'])
        .filter((name) => name)
    }

    const laqmUnavailable = Boolean(laResult?._meta?.unavailable)
    const laqmUnavailableReason = laResult?._meta?.reason

    // Handle GET request
    if (request.method === 'get') {
      // Check session data to pre-populate the form
      const selectedLocation = request.yar.get(SESSION_LOCATION)
      const selectedCountries = request.yar.get(SESSION_SELECTED_COUNTRIES)
      const selectedlocations = request.yar.get(SESSION_SELECTED_LOCATION_LOWER)
      const selectedLocalAuthorities = request.yar.get(
        SESSION_SELECTED_LOCATIONS
      )

      const formData = determineFormDataFromSession(
        selectedLocation,
        selectedCountries,
        selectedLocalAuthorities,
        selectedlocations
      )
      const isNoJS =
        request.query?.nojs === 'true' ||
        request.path?.includes('nojs') ||
        request.headers['user-agent']?.toLowerCase().includes('noscript')

      const templatePath = isNoJS ? LOCATION_AURN_VIEW_NOJS : LOCATION_AURN_VIEW
      return h.view(templatePath, {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: backUrl,
        laResult,
        localAuthorityNames,
        laqmUnavailable,
        laqmUnavailableReason,
        formData
      })
    }

    // Handle POST request - Server-side validation and processing
    if (request.method === 'post') {
      const isNoJS =
        request.query?.nojs === 'true' ||
        request.path?.includes('nojs') ||
        request.headers['user-agent']?.toLowerCase().includes('noscript')

      const payload = request.payload
      const errors = { list: [], details: {} }

      // Validate location selection (radio button)
      if (!payload.location) {
        errors.list.push({
          text: 'Select an option before continuing',
          href: '#location-2'
        })
        errors.details.location = 'Select an option before continuing'
      } else if (payload.location === 'countries') {
        // Validate countries selection
        if (
          !payload.country ||
          (Array.isArray(payload.country) && payload.country.length === 0)
        ) {
          errors.list.push({
            text: 'Select at least one country',
            href: '#country-england'
          })
          errors.details.country = 'Select at least one country'
        }
      } else if (payload.location === 'la') {
        if (localAuthorityNames.length === 0) {
          errors.list.push({
            text: 'Local authorities are currently unavailable. Try again later.',
            href: '#location-4'
          })
          errors.details[FIELD_LOCAL_AUTHORITY] =
            'Local authorities are currently unavailable. Try again later.'
        }

        // Handle local authorities - could be multiple from table or single from input
        let selectedLocations = []

        // Check for multiple locations from table (sent as array)
        if (payload['selected-locations']) {
          if (Array.isArray(payload['selected-locations'])) {
            selectedLocations = payload['selected-locations'].filter((loc) =>
              loc?.trim()
            )
          } else {
            selectedLocations = [payload['selected-locations']].filter((loc) =>
              loc?.trim()
            )
          }
        }

        // If no table data, check single autocomplete input
        if (
          selectedLocations.length === 0 &&
          payload['local-authority-autocomplete']
        ) {
          const singleLocation = payload['local-authority-autocomplete'].trim()
          if (singleLocation) {
            selectedLocations = [singleLocation]
          }
        }

        // Validate local authorities
        if (selectedLocations.length === 0) {
          errors.list.push({
            text: 'Add at least one local authority',
            href: ANCHOR_MY_AUTOCOMPLETE
          })
          errors.details[FIELD_LOCAL_AUTHORITY] =
            'Add at least one local authority'
        } else {
          const { seen, hasErrors } = validateSelectedLocations(
            selectedLocations,
            localAuthorityNames,
            errors
          )

          if (!hasErrors) {
            payload.selectedLocations = getCleanedLocations(
              seen,
              localAuthorityNames,
              selectedLocations
            )
          }
        }
      } else {
        // Unknown location type
      }

      // If validation fails, return to form with errors and preserve form state
      if (errors.list.length > 0) {
        const templatePath = isNoJS
          ? LOCATION_AURN_VIEW_NOJS
          : LOCATION_AURN_VIEW
        return h.view(templatePath, {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          laResult,
          localAuthorityNames,
          laqmUnavailable,
          laqmUnavailableReason,
          errors,
          formData: payload
        })
      }

      // If validation passes, process the data and store in session
      if (payload.location === 'countries') {
        // console.log('countries if')
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

        return h.redirect('/customdataset')
      } else {
        const selectedLocations = payload.selectedLocations
        const selectedLAIDs = mapLocalAuthorityIDs(selectedLocations, laResult)

        // Store in session
        request.yar.set(SESSION_SELECTED_LOCATIONS, selectedLocations)
        request.yar.set(
          SESSION_SELECTED_LOCATION,
          'Local Authorities: ' + selectedLocations.join(', ')
        )
        request.yar.set(SESSION_SELECTED_LA_IDS, selectedLAIDs.join(','))
        request.yar.set(SESSION_LOCATION, 'LocalAuthority')
        request.yar.set(SESSION_SELECTED_LOCATION_LOWER, selectedLocations)

        return h.redirect('/customdataset')
      }
    }

    // Default fallback
    const isNoJS =
      request.query?.nojs === 'true' ||
      request.path?.includes('nojs') ||
      request.headers['user-agent']?.toLowerCase().includes('noscript')

    const templatePath = isNoJS ? LOCATION_AURN_VIEW_NOJS : LOCATION_AURN_VIEW
    return h.view(templatePath, {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: backUrl,
      laResult,
      localAuthorityNames
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
