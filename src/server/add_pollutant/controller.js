/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import axios from 'axios'
import Wreck from '@hapi/wreck'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'
import {
  fetchDatasourceForPollutant,
  groupDatasources
} from '~/src/server/datasource/controller.js'

const logger = createLogger()

// Error anchor constants
const ANCHOR_MY_AUTOCOMPLETE = '#my-autocomplete'

// Route constants
const CUSTOMDATASET_URL = '/customdataset'

// Fetch pollutant list from API — returns array of { pollutantID, pollutantName, pollutant_Abbreviation, pollutant_value }
async function fetchPollutantList() {
  if (config.get('isDevelopment')) {
    try {
      const url = config.get('pollutantMasterDevUrl')
      const { payload } = await Wreck.get(url, {
        headers: {
          'x-api-key': config.get('osNamesDevApiKey')
        },
        json: true
      })
      const list = Array.isArray(payload) ? payload : []
      logger.info(`Fetched ${list.length} pollutants from master API`)
      return list
    } catch (error) {
      logger.error(
        `Failed to fetch pollutant list: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return null
    }
  } else {
    try {
      const response = await axios.get(config.get('pollutantMasterApiUrl'))
      const list = Array.isArray(response.data) ? response.data : []
      logger.info(`Fetched ${list.length} pollutants from master API`)
      return list
    } catch (error) {
      logger.error(
        `Failed to fetch pollutant list: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return null
    }
  }
}

const pollutantGroups = {
  core: [
    'Fine particulate matter (PM2.5)',
    'Particulate matter (PM10)',
    'Nitrogen dioxide (NO2)',
    'Ozone (O3)',
    'Sulphur dioxide (SO2)'
  ],
  compliance: [
    'Fine particulate matter (PM2.5)',
    'Particulate matter (PM10)',
    'Nitrogen dioxide (NO2)',
    'Ozone (O3)',
    'Sulphur dioxide (SO2)',
    'Nitric oxide (NO)',
    'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
    'Carbon monoxide (CO)'
  ]
}

// Helper function to check if a pollutant is allowed against the API-fetched list
const isAllowedPollutant = (value, pollutantMasterList) => {
  const lowerValue = (value || '').toLowerCase().trim()
  return pollutantMasterList.some(
    (p) =>
      (p.pollutant_value || '').toLowerCase().trim() === lowerValue ||
      (p.pollutantName || '').toLowerCase().trim() === lowerValue
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
    logger.error(
      `Failed to parse pollutants: ${e instanceof Error ? e.message : 'unknown error'}`
    )
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
const validateSpecificPollutants = (
  finalPollutantsSp,
  errors,
  isNoJS,
  pollutantMasterList
) => {
  const invalidPollutants = []
  const duplicates = []
  const seen = new Set()

  const pollutantAnchor = isNoJS
    ? '#selected-pollutants'
    : ANCHOR_MY_AUTOCOMPLETE

  finalPollutantsSp.forEach((pollutant) => {
    const trimmed = (pollutant || '').trim()
    if (!isAllowedPollutant(trimmed, pollutantMasterList)) {
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
      href: pollutantAnchor
    })
  }

  if (duplicates.length > 0) {
    errors.push({
      text: `Duplicate pollutant(s): ${duplicates.join(', ')} have already been added.`,
      href: pollutantAnchor
    })
  }

  if (finalPollutantsSp.length === 0) {
    errors.push({
      text: 'Please add at least one pollutant',
      href: pollutantAnchor
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
const processSpecificMode = (
  isNoJS,
  request,
  pollutantsData,
  errors,
  pollutantMasterList
) => {
  const rawFromPayload = getRawPayloadForSpecificMode(
    isNoJS,
    request,
    pollutantsData
  )
  const finalPollutantsSp = parsePollutantsData(rawFromPayload, errors)
  validateSpecificPollutants(
    finalPollutantsSp,
    errors,
    isNoJS,
    pollutantMasterList
  )
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
  pollutants,
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
    selectedPollutants: selectedForView,
    pollutants
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
const handlePostRequest = async (request, h) => {
  const isNoJS = checkIsNoJS(request)

  const {
    'pollutant-mode': selectedMode,
    'pollutant-group': selectedGroup,
    selectedPollutants: pollutantsData
  } = request.payload || {}

  // Use pollutant master list from session (fetched on GET)
  const pollutantMasterList = request.yar.get('pollutantMasterList') || []
  const pollutants = pollutantMasterList

  if (selectedMode === 'specific') {
    request.yar.set('selectedPollutantGroup', '')
  }

  let finalPollutantsGr = []
  let finalPollutantsSp = []
  const errors = []

  if (!selectedMode) {
    errors.push({
      text: 'Select an option before continuing',
      href: '#mode-specific'
    })
  }

  if (selectedMode === 'group') {
    finalPollutantsGr = processGroupMode(selectedGroup, errors)
  } else if (selectedMode === 'specific') {
    finalPollutantsSp = processSpecificMode(
      isNoJS,
      request,
      pollutantsData,
      errors,
      pollutantMasterList
    )
  }

  if (errors.length > 0) {
    return handleValidationErrors(
      errors,
      isNoJS,
      selectedMode,
      finalPollutantsGr,
      finalPollutantsSp,
      selectedGroup,
      pollutants,
      h
    )
  }

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

  // Find the pollutantID for the first selected pollutant and pre-fetch datasources
  const firstPollutantValue = finalPollutants[0]
  const matched = pollutantMasterList.find(
    (p) => p.pollutant_value === firstPollutantValue
  )
  if (matched) {
    request.yar.set('selectedPollutantID', matched.pollutantID)
    const flat = await fetchDatasourceForPollutant(matched.pollutantID)
    if (flat === null) {
      return h.redirect('/problem-with-service?statusCode=500')
    }
    request.yar.set('datasourceGroups', groupDatasources(flat))
  } else {
    request.yar.set('datasourceGroups', [])
  }

  return h.redirect(CUSTOMDATASET_URL)
}

// Helper function to handle GET request
const handleGetRequest = async (request, h) => {
  const backUrl = CUSTOMDATASET_URL

  request.yar.set('searchQuery', null)
  request.yar.set('fullSearchQuery', null)
  request.yar.set('searchLocation', '')
  request.yar.set('osnameapiresult', '')
  request.yar.set('selectedLocation', '')
  request.yar.set('nooflocation', '')

  // Fetch pollutant list from API and store in session for POST validation
  const pollutants = await fetchPollutantList()

  if (pollutants === null) {
    return h.redirect('/problem-with-service?statusCode=500')
  }

  request.yar.set('pollutantMasterList', pollutants)

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
    selectedGroup: existingGroup,
    pollutants
  })
}

export const airpollutantController = {
  async handler(request, h) {
    if (request.method === 'post') {
      return await handlePostRequest(request, h)
    }

    return handleGetRequest(request, h)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
