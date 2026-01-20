/**
 * A GDS styled example customdataset page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { englishNew } from '~/src/server/data/en/content_aurn.js'
import { config } from '~/src/config/config.js'
import Wreck from '@hapi/wreck'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export const locationaurnController = {
  handler: async (request, h) => {
    const backUrl = '/customdataset'
    const logger = createLogger()
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
        logger.info('Enters the InvokeLocalauthority')

        // Log configuration values (mask sensitive data)
        const apiKey = config.get('laqmAPIkey')
        const partnerId = config.get('laqmAPIPartnerId')

        logger.info(`API Key exists: ${apiKey}`)
        logger.info(`Partner ID: ${partnerId}`)

        if (!apiKey || !partnerId) {
          throw new Error(
            `Missing configuration: APIKey=${!!apiKey}, PartnerId=${!!partnerId}`
          )
        }

        const url = 'https://www.laqmportal.co.uk/xapi/getLocalAuthorities/json'

        logger.info(`Making request to: ${url}`)
        // Add timeout and more detailed options
        const options = {
          headers: {
            'X-API-Key': apiKey,
            'X-API-PartnerId': partnerId
          }
          // 30 second timeout
          // Get raw payload to debug
        }
        // logger.info(` X-API-Key: ${options.headers['X-API-Key']}`)
        // logger.info(` X-API-PartnerId: ${options.headers['X-API-PartnerId']}`)

        const startTime = Date.now()
        logger.info(` Request started at: ${startTime}`)
        logger.info(` Request started url: ${url}`)
        const { res, payload } = await Wreck.get(url, options)
        logger.info(` Request ended at: ${Date.now()}`)
        // logger.info(` Request ended url: ${options}`)
        // const duration = Date.now() - startTime

        // Check HTTP status
        if (res.statusCode !== 200) {
          const errorBody = payload
            ? payload.toString('utf8')
            : 'No response body'
          logger.error('HTTP Error:', {
            status: res.statusCode,
            statusMessage: res.statusMessage,
            body: errorBody,
            headers: res.headers
          })
          logger.error(`HTTP Error: ${res.statusCode}`)
          logger.error(`statusMessage: ${res.statusMessage}`)
          logger.error(`body: ${errorBody}`)
          //  logger.error(`headers: ${res.headers}`)

          throw new Error(
            `HTTP ${res.statusCode}: ${res.statusMessage}. Body: ${errorBody}`
          )
        }

        // Check if payload exists
        if (!payload) {
          logger.error('No payload received from API')
          throw new Error('Empty response from API')
        }

        // Parse JSON
        const jsonString = payload.toString('utf8')
        logger.info('JSON string length:', jsonString.length)
        logger.info(
          'JSON string preview:',
          jsonString.substring(0, 200) + '...'
        )

        let parsedData
        try {
          parsedData = JSON.parse(jsonString)
        } catch (parseError) {
          logger.error('JSON Parse Error:', {
            error: parseError.message,
            jsonPreview: jsonString.substring(0, 500)
          })
          throw new Error(`Failed to parse JSON: ${parseError.message}`)
        }

        logger.info('Parsed data structure:', {
          type: typeof parsedData,
          keys: parsedData ? Object.keys(parsedData) : [],
          dataExists: !!parsedData?.data,
          dataLength: Array.isArray(parsedData?.data)
            ? parsedData.data.length
            : 'not array'
        })

        // Validate response structure
        if (!parsedData || typeof parsedData !== 'object') {
          logger.error('Invalid response structure:', typeof parsedData)
          throw new Error('Invalid response structure from API')
        }

        if (!parsedData.data || !Array.isArray(parsedData.data)) {
          logger.warn('Unexpected data structure:', {
            hasData: !!parsedData.data,
            dataType: typeof parsedData.data,
            isArray: Array.isArray(parsedData.data)
          })
          // Don't throw error here, just log and return empty data
          return { data: [] }
        }

        logger.info(
          'Successfully fetched local authorities:',
          parsedData.data.length
        )
        return parsedData
      } catch (error) {
        // Enhanced error logging
        logger.error(`error.name: ${error.name} `)
        logger.error(`error.message: ${error.message} `)
        logger.error(`error.stack: ${error.stack} `)
        logger.error(`error.code: ${error.code} `)
        logger.error(`data: error.data: ${error.data} `)
        logger.error(`Error in Invokelocalauthority: ${error.message} `, {
          message: error.message,
          name: error.name,
          stack: error.stack,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          hostname: error.hostname,
          // For Wreck/HTTP errors
          statusCode: error.statusCode,
          data: error.data,
          // For network errors
          address: error.address,
          port: error.port,
          // Additional context
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        })

        // Check for specific error types
        if (error.code === 'ENOTFOUND') {
          logger.error('DNS lookup failed - check network connectivity and URL')
        } else if (error.code === 'ECONNREFUSED') {
          logger.error('Connection refused - service might be down')
        } else if (error.code === 'ETIMEDOUT') {
          logger.error('Request timed out - service might be slow or down')
        } else if (error.statusCode) {
          logger.error('HTTP error:', error.statusCode)
        }

        // Return empty data instead of throwing to prevent controller crash
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
