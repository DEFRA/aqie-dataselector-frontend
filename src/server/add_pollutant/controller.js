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
      const {
        'pollutant-mode': selectedMode,
        'pollutant-group': selectedGroup,
        selectedPollutants: pollutantsData
      } = request.payload || {}

      // console.log('Form data received:', {
      //   selectedMode,
      //   selectedGroup,
      //   pollutantsData
      // })

      // Define allowed pollutants for validation
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

      let finalPollutants = []
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

          finalPollutants = groups[selectedGroup] || []
          // console.log(
          //   `Selected group '${selectedGroup}' with pollutants:`,
          //   finalPollutants
          // )
        }
      }
      // Handle specific pollutants selection
      else if (selectedMode === 'specific') {
        if (pollutantsData) {
          try {
            // Try to parse JSON if it's a string
            if (typeof pollutantsData === 'string') {
              finalPollutants = JSON.parse(pollutantsData)
            } else if (Array.isArray(pollutantsData)) {
              finalPollutants = pollutantsData
            }
            // console.log('Parsed specific pollutants:', finalPollutants)

            // VALIDATION 3: Validate each selected pollutant
            const invalidPollutants = []
            const duplicates = []
            const seen = new Set()

            finalPollutants.forEach((pollutant) => {
              const trimmed = (pollutant || '').trim()

              // Check if pollutant is valid
              if (!isAllowed(trimmed)) {
                invalidPollutants.push(trimmed)
              }

              // Check for duplicates
              const lowerPollutant = trimmed.toLowerCase()
              if (seen.has(lowerPollutant)) {
                duplicates.push(trimmed)
              } else {
                seen.add(lowerPollutant)
              }
            })

            // Add validation errors
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

            // VALIDATION 4: Check maximum limit (10 pollutants)
            if (finalPollutants.length > 10) {
              errors.push({
                text: 'You can add up to 10 pollutants maximum.',
                href: '#my-autocomplete'
              })
            }
          } catch (error) {
            // console.error('Error parsing pollutants data:', error)
            errors.push({
              text: 'Invalid pollutants data format.',
              href: '#my-autocomplete'
            })
          }
        }

        // VALIDATION 5: Check if at least one pollutant is added in specific mode
        if (!finalPollutants || finalPollutants.length === 0) {
          errors.push({
            text: 'Please add at least one pollutant',
            href: '#my-autocomplete'
          })
        }
      }

      // If there are validation errors, return to form with errors
      if (errors.length > 0) {
        // console.log('Validation errors found:', errors)

        // Check for no-JS indicators
        const isNoJS =
          request.query?.nojs === 'true' ||
          request.path?.includes('nojs') ||
          request.headers['user-agent']?.toLowerCase().includes('noscript')

        const templatePath = isNoJS
          ? 'add_pollutant/index_nojs'
          : 'add_pollutant/index'

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
          // Preserve form state
          selectedMode,
          selectedGroup,
          selectedPollutants: finalPollutants
        })
      }

      // Store in session
      request.yar.set('selectedPollutants', finalPollutants)
      request.yar.set('selectedPollutantMode', selectedMode)
      if (selectedGroup) {
        request.yar.set('selectedPollutantGroup', selectedGroup)
      }

      // console.log('Final pollutants stored in session:', finalPollutants)
      // console.log('Selected mode:', selectedMode)

      // Redirect to customdataset without pollutants in URL
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
    request.yar.set('yearselected', '2024')
    request.yar.set('selectedYear', '2025')

    // Get existing pollutants and mode from session to pre-populate form
    const existingPollutants = request.yar.get('selectedPollutants') || []
    const existingMode = request.yar.get('selectedPollutantMode') || ''
    const existingGroup = request.yar.get('selectedPollutantGroup') || ''

    // Check for no-JS indicators
    const isNoJS =
      request.query?.nojs === 'true' ||
      request.path?.includes('nojs') ||
      request.headers['user-agent']?.toLowerCase().includes('noscript')

    const templatePath = isNoJS
      ? 'add_pollutant/index_nojs'
      : 'add_pollutant/index'

    return h.view(templatePath, {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: backUrl,
      // Pre-populate form with existing selections
      selectedPollutants: existingPollutants,
      selectedMode: existingMode,
      selectedGroup: existingGroup
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
