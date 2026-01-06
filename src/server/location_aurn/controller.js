/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import Wreck from '@hapi/wreck'
export const locationaurnController = {
  handler: async (request, h) => {
    const backUrl = '/customdataset'

    // DON'T clear session data - preserve previous selections for "change" functionality
    // Only clear specific search-related temporary data
    if (request.method === 'get') {
      request.yar.set('searchQuery', null)
      request.yar.set('fullSearchQuery', null)
      request.yar.set('osnameapiresult', '')
      // Keep selectedLocation, selectedLocations, selectedCountries, etc. for pre-population
    }

    async function Invokelocalauthority() {
      try {
        const url = 'https://www.laqmportal.co.uk/xapi/getLocalAuthorities/json'
        const { payload } = await Wreck.get(url, {
          headers: {
            'X-API-Key': config.get('laqmAPIkey'),
            'X-API-PartnerId': config.get('laqmAPIPartnerId')
          }
        })

        const jsonString = payload.toString('utf8')
        const parsedData = JSON.parse(jsonString)
        return parsedData
      } catch (error) {
        // console.error('Error fetching local authorities:', error)
        return { data: [] }
      }
    }

    const laResult = await Invokelocalauthority()
    // console.log('local authority result', laResult)

    // Extract local authority names for autocomplete
    let localAuthorityNames = []
    if (laResult?.data && Array.isArray(laResult.data)) {
      localAuthorityNames = laResult.data
        .map((item) => item['Local Authority Name'])
        .filter((name) => name)
    }

    // Handle GET request
    if (request.method === 'get') {
      // Prepare form data from session for pre-population
      const formData = {}

      // Check session data to pre-populate the form
      const selectedLocation = request.yar.get('Location')
      const selectedCountries = request.yar.get('selectedCountries')
      const selectedlocations = request.yar.get('selectedlocation') // This could be countries or local authorities
      const selectedLocalAuthorities = request.yar.get('selectedLocations')

      // Determine which radio option should be selected and what data to pre-populate
      if (selectedLocation === 'Country' && selectedCountries) {
        formData.location = 'countries'
        formData.country = selectedCountries
      } else if (
        selectedLocation === 'LocalAuthority' &&
        selectedLocalAuthorities
      ) {
        formData.location = 'la'
        formData['selected-locations'] = selectedLocalAuthorities
      } else if (selectedlocations && Array.isArray(selectedlocations)) {
        // Fallback: try to determine from selectedlocation data
        // If it looks like countries (common country names), use countries
        const countryNames = [
          'england',
          'scotland',
          'wales',
          'northern ireland'
        ]
        const isCountries = selectedlocations.some((loc) =>
          countryNames.includes(loc.toLowerCase())
        )

        if (isCountries) {
          formData.location = 'countries'
          formData.country = selectedlocations
        } else {
          formData.location = 'la'
          formData['selected-locations'] = selectedlocations
        }
      }

      return h.view('location_aurn/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: backUrl,
        laResult,
        localAuthorityNames,
        formData
      })
    }

    // Handle POST request - Server-side validation and processing
    if (request.method === 'post') {
      const payload = request.payload
      const errors = { list: [], details: {} }

      // console.log('POST payload received:', payload)

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
            href: '#my-autocomplete'
          })
          errors.details['local-authority'] = 'Add at least one local authority'
        } else {
          // Validate each local authority against the allowed list
          const allowedLAs = new Set(
            localAuthorityNames.map((name) => name.toLowerCase().trim())
          )
          const invalidLAs = []
          const duplicates = new Set()
          const seen = new Set()

          for (const location of selectedLocations) {
            const trimmed = location.trim()
            const lower = trimmed.toLowerCase()

            // Check for duplicates
            if (seen.has(lower)) {
              duplicates.add(trimmed)
            } else {
              seen.add(lower)
            }

            // Check if valid local authority
            if (!allowedLAs.has(lower)) {
              invalidLAs.push(trimmed)
            }
          }

          // Check for too many locations
          if (selectedLocations.length > 10) {
            errors.list.push({
              text: 'You can only select up to 10 local authorities',
              href: '#my-autocomplete'
            })
            errors.details['local-authority'] =
              'You can only select up to 10 local authorities'
          }

          // Check for invalid local authorities
          if (invalidLAs.length > 0) {
            errors.list.push({
              text: 'Select local authorities from the list',
              href: '#my-autocomplete'
            })
            errors.details['local-authority'] =
              'Select local authorities from the list'
          }

          // Check for duplicates
          if (duplicates.size > 0) {
            errors.list.push({
              text: 'Remove duplicate local authorities',
              href: '#my-autocomplete'
            })
            errors.details['local-authority'] =
              'Remove duplicate local authorities'
          }

          // Store cleaned locations if valid
          if (errors.list.length === 0) {
            payload.selectedLocations = Array.from(seen).map((lower) => {
              // Find original casing from the allowed list
              return (
                localAuthorityNames.find(
                  (name) => name.toLowerCase().trim() === lower
                ) ||
                selectedLocations.find(
                  (loc) => loc.toLowerCase().trim() === lower
                )
              )
            })
          }
        }
      }

      // If validation fails, return to form with errors and preserve form state
      if (errors.list.length > 0) {
        return h.view('location_aurn/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          displayBacklink: true,
          hrefq: backUrl,
          laResult,
          localAuthorityNames,
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
        request.yar.set('selectedCountries', selectedCountries)
        request.yar.set(
          'selectedLocation',
          'Countries: ' + selectedCountries.join(', ')
        )
        request.yar.set('Location', 'Country')
        request.yar.set('selectedlocation', selectedCountries)
        // console.log('selectedlocation:', request.yar.get('selectedlocation'))
        // console.log('Stored selected countries:', selectedCountries)
        return h.redirect('/customdataset')
      } else if (payload.location === 'la') {
        // console.log('la if')
        const selectedLocations = payload.selectedLocations

        // Map selected local authority names to their LA IDs
        const selectedLAIDs = []
        if (laResult?.data && Array.isArray(laResult.data)) {
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
        }

        // Store in session
        request.yar.set('selectedLocations', selectedLocations)
        request.yar.set(
          'selectedLocation',
          'Local Authorities: ' + selectedLocations.join(', ')
        )
        request.yar.set('selectedLAIDs', selectedLAIDs.join(','))
        request.yar.set('Location', 'LocalAuthority')
        request.yar.set('selectedlocation', selectedLocations)
        // console.log('selectedlocation:', request.yar.get('selectedlocation'))
        // console.log('Stored selected local authorities:', selectedLocations)
        // console.log('Stored selected LA IDs:', selectedLAIDs.join(','))
        return h.redirect('/customdataset')
      }
    }

    // Default fallback

    return h.view('location_aurn/index', {
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
