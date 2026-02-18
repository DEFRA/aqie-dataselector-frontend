/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Pollutant name constants
const POLLUTANT_PM25_FULL = 'Fine particulate matter (PM2.5)'
const POLLUTANT_PM25_SHORT = 'Particulate matter (PM2.5)'
const POLLUTANT_PM25_ABBR = 'PM2.5'
const POLLUTANT_PM10_FULL = 'Particulate matter (PM10)'
const POLLUTANT_PM10_ABBR = 'PM10'
const POLLUTANT_NO2_FULL = 'Nitrogen dioxide (NO2)'
const POLLUTANT_NO2_NAME = 'Nitrogen dioxide'
const POLLUTANT_NO2_ABBR = 'NO2'
const POLLUTANT_O3_FULL = 'Ozone (O3)'
const POLLUTANT_O3_NAME = 'Ozone'
const POLLUTANT_O3_ABBR = 'O3'
const POLLUTANT_SO2_FULL = 'Sulphur dioxide (SO2)'
const POLLUTANT_SO2_NAME = 'Sulphur dioxide'
const POLLUTANT_SO2_ABBR = 'SO2'
const POLLUTANT_NO_FULL = 'Nitric oxide (NO)'
const POLLUTANT_NO_NAME = 'Nitric oxide'
const POLLUTANT_NO_ABBR = 'NO'
const POLLUTANT_NOX_FULL = 'Nitrogen oxides as nitrogen dioxide (NOx as NO2)'
const POLLUTANT_NOX_NAME = 'Nitrogen oxides as nitrogen dioxide'
const POLLUTANT_NOX_ABBR = 'NOx as NO2'
const POLLUTANT_CO_FULL = 'Carbon monoxide (CO)'
const POLLUTANT_CO_NAME = 'Carbon monoxide'
const POLLUTANT_CO_ABBR = 'CO'

// Error anchor constants
const ANCHOR_MY_AUTOCOMPLETE = '#my-autocomplete'

// Route constants
const CUSTOMDATASET_URL = '/customdataset'

const allowedPollutants = [
  POLLUTANT_PM25_FULL,
  POLLUTANT_PM10_FULL,
  POLLUTANT_NO2_FULL,
  POLLUTANT_O3_FULL,
  POLLUTANT_SO2_FULL,
  POLLUTANT_NO_FULL,
  POLLUTANT_NOX_FULL,
  POLLUTANT_CO_FULL,
  // Additional variations for better matching
  POLLUTANT_PM25_SHORT,
  POLLUTANT_PM25_ABBR,
  POLLUTANT_PM10_ABBR,
  POLLUTANT_NO2_NAME,
  POLLUTANT_NO2_ABBR,
  POLLUTANT_O3_NAME,
  POLLUTANT_O3_ABBR,
  POLLUTANT_SO2_NAME,
  POLLUTANT_SO2_ABBR,
  POLLUTANT_NO_NAME,
  POLLUTANT_NO_ABBR,
  POLLUTANT_NOX_NAME,
  POLLUTANT_NOX_ABBR,
  POLLUTANT_CO_NAME,
  POLLUTANT_CO_ABBR
]

const pollutantGroups = {
  core: [
    POLLUTANT_PM25_SHORT,
    POLLUTANT_PM10_FULL,
    POLLUTANT_NO2_FULL,
    POLLUTANT_O3_FULL,
    POLLUTANT_SO2_FULL
  ],
  compliance: [
    POLLUTANT_PM25_SHORT,
    POLLUTANT_PM10_FULL,
    POLLUTANT_NO2_FULL,
    POLLUTANT_O3_FULL,
    POLLUTANT_SO2_FULL,
    POLLUTANT_NO_FULL,
    POLLUTANT_NOX_FULL,
    POLLUTANT_CO_FULL
  ]
}

// Helper function to check if a pollutant is allowed
const isAllowedPollutant = (value) => {
  const lowerValue = (value || '').toLowerCase().trim()
  return allowedPollutants.some(
    (pollutant) => pollutant.toLowerCase().trim() === lowerValue
  )
}

// Helper function to check for no-JS version
const checkIsNoJS = (request) => {
  return (
    request.query?.nojs === 'true' ||
    request.path?.includes('nojs') ||
    request.headers['user-agent']?.toLowerCase().includes('noscript')
  )
}

// Helper function to parse pollutants data
const parsePollutantsData = (rawFromPayload, errors) => {
  try {
    if (
      typeof rawFromPayload === 'string' &&
      rawFromPayload.trim() &&
      rawFromPayload !== '[]' &&
      rawFromPayload !== '['
    ) {
      return JSON.parse(rawFromPayload)
    }

    if (Array.isArray(rawFromPayload)) {
      return rawFromPayload
    }

    return []
  } catch (e) {
    errors.push({
      text: 'Invalid pollutants data format.',
      href: '#selected-pollutants'
    })
    return []
  }
}

// Helper function to get raw payload for specific pollutants
const getRawPayloadForSpecificMode = (isNoJS, request, pollutantsData) => {
  if (isNoJS && request.payload?.['selected-pollutants']) {
    return [request.payload['selected-pollutants']]
  }

  if (isNoJS) {
    return request.yar.get('selectedpollutants_specific')
  }

  return pollutantsData
}

// Helper function to validate specific pollutants
const validateSpecificPollutants = (finalPollutantsSp, errors) => {
  const invalidPollutants = []
  const duplicates = []
  const seen = new Set()

  finalPollutantsSp.forEach((pollutant) => {
    const trimmed = (pollutant || '').trim()
    if (!isAllowedPollutant(trimmed)) {
      invalidPollutants.push(trimmed)
    }
    const lower = trimmed.toLowerCase()
    if (seen.has(lower)) {
      duplicates.push(trimmed)
    } else {
      seen.add(lower)
    }
  })

  if (invalidPollutants.length > 0) {
    errors.push({
      text: `Invalid pollutant(s): ${invalidPollutants.join(', ')}. Select from the allowed list.`,
      href: ANCHOR_MY_AUTOCOMPLETE
    })
  }

  if (duplicates.length > 0) {
    errors.push({
      text: `Duplicate pollutant(s): ${duplicates.join(', ')} have already been added.`,
      href: ANCHOR_MY_AUTOCOMPLETE
    })
  }

  if (finalPollutantsSp.length === 0) {
    errors.push({
      text: 'Please add at least one pollutant',
      href: ANCHOR_MY_AUTOCOMPLETE
    })
  }
}

// Helper function to process group mode
const processGroupMode = (selectedGroup, errors) => {
  if (!selectedGroup) {
    errors.push({
      text: 'Select a pollutant group',
      href: '#pg-core'
    })
    return []
  }

  return pollutantGroups[selectedGroup] || []
}

// Helper function to process specific mode
const processSpecificMode = (isNoJS, request, pollutantsData, errors) => {
  const rawFromPayload = getRawPayloadForSpecificMode(
    isNoJS,
    request,
    pollutantsData
  )
  const finalPollutantsSp = parsePollutantsData(rawFromPayload, errors)
  validateSpecificPollutants(finalPollutantsSp, errors)
  return finalPollutantsSp
}

// Helper function to handle validation errors
const handleValidationErrors = (
  errors,
  isNoJS,
  selectedMode,
  finalPollutantsGr,
  finalPollutantsSp,
  selectedGroup,
  h
) => {
  const templatePath = isNoJS
    ? 'add_pollutant/index_nojs'
    : 'add_pollutant/index'

  const selectedForView =
    selectedMode === 'group' ? finalPollutantsGr : finalPollutantsSp

  return h.view(templatePath, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    displayBacklink: true,
    hrefq: CUSTOMDATASET_URL,
    errors: {
      list: errors
    },
    errorMessage: {
      message: { text: errors[0].text }
    },
    selectedMode,
    selectedGroup: selectedMode === 'group' ? selectedGroup : '',
    selectedPollutants: selectedForView
  })
}

// Helper function to update session after validation
const updateSessionAfterValidation = (
  request,
  selectedMode,
  previousMode,
  finalPollutants,
  finalPollutantsGr,
  finalPollutantsSp,
  selectedGroup
) => {
  if (previousMode && previousMode !== selectedMode) {
    request.yar.set('selectedPollutants', [])
    request.yar.set('selectedPollutantGroup', '')
  }

  request.yar.set('selectedPollutants', finalPollutants)
  request.yar.set('selectedPollutantMode', selectedMode)

  if (selectedMode === 'group') {
    request.yar.set('selectedPollutantGroup', selectedGroup || '')
    request.yar.set('selectedpollutants_group', finalPollutantsGr)
    request.yar.set('selectedpollutants_specific', [])
  } else {
    request.yar.set('selectedPollutantGroup', '')
    request.yar.set('selectedpollutants_specific', finalPollutantsSp)
    request.yar.set('selectedpollutants_group', [])
  }
}

// Helper function to handle POST request
const handlePostRequest = (request, h) => {
  const isNoJS = checkIsNoJS(request)

  const {
    'pollutant-mode': selectedMode,
    'pollutant-group': selectedGroup,
    selectedPollutants: pollutantsData
  } = request.payload || {}

  // Clear group selection from session immediately if mode is 'specific'
  if (selectedMode === 'specific') {
    request.yar.set('selectedPollutantGroup', '')
  }

  let finalPollutantsGr = []
  let finalPollutantsSp = []
  const errors = []

  // VALIDATION 1: Check if mode is selected
  if (!selectedMode) {
    errors.push({
      text: 'Select an option before continuing',
      href: '#mode-specific'
    })
  }

  // Handle group selection
  if (selectedMode === 'group') {
    finalPollutantsGr = processGroupMode(selectedGroup, errors)
  } else if (selectedMode === 'specific') {
    finalPollutantsSp = processSpecificMode(
      isNoJS,
      request,
      pollutantsData,
      errors
    )
  }

  // If there are validation errors, return to form with errors
  if (errors.length > 0) {
    return handleValidationErrors(
      errors,
      isNoJS,
      selectedMode,
      finalPollutantsGr,
      finalPollutantsSp,
      selectedGroup,
      h
    )
  }

  // Clear session when switching modes and update session
  const previousMode = request.yar.get('selectedPollutantMode')
  const finalPollutants =
    selectedMode === 'group' ? finalPollutantsGr : finalPollutantsSp

  updateSessionAfterValidation(
    request,
    selectedMode,
    previousMode,
    finalPollutants,
    finalPollutantsGr,
    finalPollutantsSp,
    selectedGroup
  )

  return h.redirect(CUSTOMDATASET_URL)
}

// Helper function to handle GET request
const handleGetRequest = (request, h) => {
  const backUrl = CUSTOMDATASET_URL

  // Clear existing session values
  request.yar.set('searchQuery', null)
  request.yar.set('fullSearchQuery', null)
  request.yar.set('searchLocation', '')
  request.yar.set('osnameapiresult', '')
  request.yar.set('selectedLocation', '')
  request.yar.set('nooflocation', '')

  // Pre-populate strictly from session
  const existingPollutants = request.yar.get('selectedPollutants') || []
  const existingMode = request.yar.get('selectedPollutantMode') || ''
  const existingGroup =
    existingMode === 'group'
      ? request.yar.get('selectedPollutantGroup') || ''
      : ''

  const isNoJS = checkIsNoJS(request)
  const templatePath = isNoJS
    ? 'add_pollutant/index_nojs'
    : 'add_pollutant/index'

  return h.view(templatePath, {
    pageTitle: englishNew.custom.pageTitle,
    heading: englishNew.custom.heading,
    texts: englishNew.custom.texts,
    displayBacklink: true,
    hrefq: backUrl,
    selectedPollutants: existingPollutants,
    selectedMode: existingMode,
    selectedGroup: existingGroup
  })
}

export const airpollutantController = {
  handler(request, h) {
    if (request.method === 'post') {
      return handlePostRequest(request, h)
    }

    return handleGetRequest(request, h)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
