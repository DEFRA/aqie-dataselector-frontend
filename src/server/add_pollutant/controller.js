/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'

export const airpollutantController = {
  handler(request, h) {
    // Handle POST requests (form submission)
    if (request.method === 'post') {
      // Check for no-JS version
      const isNoJS =
        request.query?.nojs === 'true' ||
        request.path?.includes('nojs') ||
        request.headers['user-agent']?.toLowerCase().includes('noscript')

      const {
        'pollutant-mode': selectedMode,
        'pollutant-group': selectedGroup,
        selectedPollutants: pollutantsData
      } = request.payload || {}

      // Clear group selection from session immediately if mode is 'specific'
      if (selectedMode === 'specific') {
        request.yar.set('selectedPollutantGroup', '')
      }

      const allowedPollutants = [
        'Fine particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide (NO2)',
        'Ozone (O3)',
        'Sulphur dioxide (SO2)',
        'Nitric oxide (NO)',
        'Nitrogen oxides as nitrogen dioxide (NOx as NO2)',
        'Carbon monoxide (CO)',
        // Additional variations for better matching
        'Particulate matter (PM2.5)',
        'PM2.5',
        'PM10',
        'Nitrogen dioxide',
        'NO2',
        'Ozone',
        'O3',
        'Sulphur dioxide',
        'SO2',
        'Nitric oxide',
        'NO',
        'Nitrogen oxides as nitrogen dioxide',
        'NOx as NO2',
        'Carbon monoxide',
        'CO'
      ]

      // Helper function to check if a pollutant is allowed
      const isAllowed = (value) => {
        const lowerValue = (value || '').toLowerCase().trim()
        return allowedPollutants.some(
          (pollutant) => pollutant.toLowerCase().trim() === lowerValue
        )
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
        // VALIDATION 2: Check if group is selected when in group mode
        if (!selectedGroup) {
          errors.push({
            text: 'Select a pollutant group',
            href: '#pg-core'
          })
        } else {
          const groups = {
            core: [
              'Particulate matter (PM2.5)',
              'Particulate matter (PM10)',
              'Nitrogen dioxide',
              'Ozone',
              'Sulphur dioxide'
            ],
            compliance: [
              'Particulate matter (PM2.5)',
              'Particulate matter (PM10)',
              'Nitrogen dioxide',
              'Ozone',
              'Sulphur dioxide',
              'Nitric oxide',
              'Nitrogen oxides as nitrogen dioxide',
              'Carbon monoxide'
            ]
          }

          finalPollutantsGr = groups[selectedGroup] || []
          //  console.log('Selected group pollutants:', finalPollutantsGr)
        }
      }
      // Handle specific pollutants selection
      else if (selectedMode === 'specific') {
        // For nojs: prefer the dropdown selection, then check hidden input, then session
        let rawFromPayload

        if (isNoJS && request.payload?.['selected-pollutants']) {
          // NoJS version: Replace with new selection from dropdown
          rawFromPayload = [request.payload['selected-pollutants']]
        } else if (isNoJS) {
          // NoJS version with no new selection: continue with whatever is in session
          rawFromPayload = request.yar.get('selectedpollutants_specific')
        } else {
          // JS version: payload is the source of truth; do not resurrect from session
          rawFromPayload = pollutantsData
        }

        try {
          if (
            typeof rawFromPayload === 'string' &&
            rawFromPayload.trim() &&
            rawFromPayload !== '[]' &&
            rawFromPayload !== '['
          ) {
            // JSON string from hidden input
            finalPollutantsSp = JSON.parse(rawFromPayload)
          } else if (Array.isArray(rawFromPayload)) {
            finalPollutantsSp = rawFromPayload
          } else {
            finalPollutantsSp = []
          }
        } catch (e) {
          finalPollutantsSp = []
          errors.push({
            text: 'Invalid pollutants data format.',
            href: '#selected-pollutants'
          })
        }

        // VALIDATION
        const invalidPollutants = []
        const duplicates = []
        const seen = new Set()

        finalPollutantsSp.forEach((pollutant) => {
          const trimmed = (pollutant || '').trim()
          if (!isAllowed(trimmed)) invalidPollutants.push(trimmed)
          const lower = trimmed.toLowerCase()
          if (seen.has(lower)) duplicates.push(trimmed)
          else seen.add(lower)
        })

        if (invalidPollutants.length > 0) {
          errors.push({
            text: `Invalid pollutant(s): ${invalidPollutants.join(', ')}. Select from the allowed list.`,
            href: '#my-autocomplete'
          })
        }
        if (duplicates.length > 0) {
          errors.push({
            text: `Duplicate pollutant(s): ${duplicates.join(', ')} have already been added.`,
            href: '#my-autocomplete'
          })
        }
        if (finalPollutantsSp.length === 0) {
          errors.push({
            text: 'Please add at least one pollutant',
            href: '#my-autocomplete'
          })
        }
      }

      // If there are validation errors, return to form with errors
      if (errors.length > 0) {
        // Check for no-JS indicators
        const isNoJS =
          request.query?.nojs === 'true' ||
          request.path?.includes('nojs') ||
          request.headers['user-agent']?.toLowerCase().includes('noscript')

        const templatePath = isNoJS
          ? 'add_pollutant/index_nojs'
          : 'add_pollutant/index'

        // Use pollutants list based on selected mode
        const selectedForView =
          selectedMode === 'group' ? finalPollutantsGr : finalPollutantsSp

        return h.view(templatePath, {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: '/customdataset',
          errors: {
            list: errors
          },
          errorMessage: {
            message: { text: errors[0].text } // Show first error as main message
          },
          // Preserve form state - only show group if group mode is selected
          selectedMode,
          selectedGroup: selectedMode === 'group' ? selectedGroup : '',
          selectedPollutants: selectedForView
        })
      }

      // Clear session when switching modes
      const previousMode = request.yar.get('selectedPollutantMode')
      if (previousMode && previousMode !== selectedMode) {
        // Wipe prior selections regardless of mode
        request.yar.set('selectedPollutants', [])
        request.yar.set('selectedPollutantGroup', '')
      }

      // Decide final pollutants based on mode
      const finalPollutants =
        selectedMode === 'group' ? finalPollutantsGr : finalPollutantsSp

      // Store in session for the current mode
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

      return h.redirect('/customdataset')
    }

    // Handle GET requests (show form)
    const backUrl = '/customdataset'

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

    // Check for no-JS indicators
    const isNoJS =
      request.query?.nojs === 'true' ||
      request.path?.includes('nojs') ||
      request.headers['user-agent']?.toLowerCase().includes('noscript')
    //  console.log('isNoJS:', isNoJS)
    const templatePath = isNoJS
      ? 'add_pollutant/index_nojs'
      : 'add_pollutant/index'
    //  console.log('templatePath', templatePath)

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
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
