import { airpollutantController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'
// Mock englishNew import
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Add Pollutant Page',
      heading: 'Test Heading',
      texts: ['Test text 1', 'Test text 2']
    }
  }
}))

describe('airpollutantController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      method: 'get',
      yar: {
        set: jest.fn()
      },
      payload: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('add-pollutant-view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  describe('GET requests', () => {
    it('should set all session values and render the view with correct data', () => {
      mockRequest.method = 'get'
      const result = airpollutantController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
      expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')

      expect(mockH.view).toHaveBeenCalledWith('add_pollutant/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('add-pollutant-view-response')
    })

    it('should set displayBacklink to true and hrefq to correct back URL', () => {
      mockRequest.method = 'get'
      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      )
    })
  })

  describe('POST requests - Validation errors', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('should return error when no mode is selected', () => {
      mockRequest.payload = {}

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Select an option before continuing',
                href: '#mode-specific'
              }
            ]
          },
          errorMessage: {
            message: { text: 'Select an option before continuing' }
          }
        })
      )
    })

    it('should return error when group mode is selected but no group is chosen', () => {
      mockRequest.payload = { 'pollutant-mode': 'group' }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [{ text: 'Select a pollutant group', href: '#pg-core' }]
          },
          selectedMode: 'group'
        })
      )
    })

    it('should return error when specific mode is selected but no pollutants are added', () => {
      mockRequest.payload = { 'pollutant-mode': 'specific' }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Please add at least one pollutant',
                href: '#my-autocomplete'
              }
            ]
          },
          selectedMode: 'specific'
        })
      )
    })

    it('should return error when invalid pollutants are provided', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: ['Invalid Pollutant', 'Another Invalid One']
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Invalid pollutant(s): Invalid Pollutant, Another Invalid One. Select from the allowed list.',
                href: '#my-autocomplete'
              }
            ]
          }
        })
      )
    })

    it('should return error when duplicate pollutants are provided', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: ['NO2', 'NO2', 'PM10']
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Duplicate pollutant(s): NO2 have already been added.',
                href: '#my-autocomplete'
              }
            ]
          }
        })
      )
    })

    it('should return error when more than 10 pollutants are provided', () => {
      const manyPollutants = [
        'NO2',
        'PM10',
        'PM2.5',
        'O3',
        'SO2',
        'NO',
        'NOx as NO2',
        'CO',
        'Nitrogen dioxide',
        'Ozone',
        'Carbon monoxide' // 11 pollutants
      ]
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: manyPollutants
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: expect.arrayContaining([
              {
                text: 'You can add up to 10 pollutants maximum.',
                href: '#my-autocomplete'
              }
            ])
          }
        })
      )
    })

    it('should handle JSON string pollutants data', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: '["NO2", "PM10"]'
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'NO2',
        'PM10'
      ])
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should return error when pollutants data is invalid JSON', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        pollutantsData: 'invalid json string'
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Please add at least one pollutant',
                href: '#my-autocomplete'
              }
            ]
          },
          errorMessage: {
            message: { text: 'Please add at least one pollutant' }
          },
          selectedMode: 'specific',
          selectedGroup: undefined,
          selectedPollutants: []
        })
      )
    })
  })

  describe('POST requests - Success scenarios', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('should handle core group selection successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'group',
        'pollutant-group': 'core'
      }

      airpollutantController.handler(mockRequest, mockH)

      const expectedPollutants = [
        'Particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide',
        'Ozone',
        'Sulphur dioxide'
      ]

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutants',
        expectedPollutants
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'group'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantGroup',
        'core'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle compliance group selection successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'group',
        'pollutant-group': 'compliance'
      }

      airpollutantController.handler(mockRequest, mockH)

      const expectedPollutants = [
        'Particulate matter (PM2.5)',
        'Particulate matter (PM10)',
        'Nitrogen dioxide',
        'Ozone',
        'Sulphur dioxide',
        'Nitric oxide',
        'Nitrogen oxides as nitrogen dioxide',
        'Carbon monoxide'
      ]

      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutants',
        expectedPollutants
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'group'
      )
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantGroup',
        'compliance'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle specific pollutants selection successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: ['NO2', 'PM10', 'O3']
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'NO2',
        'PM10',
        'O3'
      ])
      expect(mockRequest.yar.set).toHaveBeenCalledWith(
        'selectedPollutantMode',
        'specific'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })

    it('should handle valid pollutant variations successfully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: [
          'Fine particulate matter (PM2.5)',
          'Nitrogen dioxide (NO2)',
          'Carbon monoxide (CO)'
        ]
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        'Fine particulate matter (PM2.5)',
        'Nitrogen dioxide (NO2)',
        'Carbon monoxide (CO)'
      ])
      expect(mockH.redirect).toHaveBeenCalled()
    })

    it('should handle unknown group gracefully', () => {
      mockRequest.payload = {
        'pollutant-mode': 'group',
        'pollutant-group': 'unknown'
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [])
      expect(mockH.redirect).toHaveBeenCalledWith('/customdataset')
    })
  })

  describe('Edge cases and complex validation', () => {
    beforeEach(() => {
      mockRequest.method = 'post'
    })

    it('should handle multiple validation errors at once', () => {
      const manyInvalidPollutants = Array(12).fill('Invalid Pollutant')
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: manyInvalidPollutants
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Invalid pollutant')
              }),
              expect.objectContaining({
                text: 'You can add up to 10 pollutants maximum.'
              })
            ])
          }
        })
      )
    })

    it('should preserve form state when validation fails', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        'pollutant-group': 'core',
        selectedPollutants: ['Invalid']
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          selectedMode: 'specific',
          selectedGroup: 'core',
          selectedPollutants: ['Invalid']
        })
      )
    })

    it('should handle empty pollutants array', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: []
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Please add at least one pollutant',
                href: '#my-autocomplete'
              }
            ]
          }
        })
      )
    })

    it('should handle null or undefined request payload', () => {
      mockRequest.payload = null

      airpollutantController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'add_pollutant/index',
        expect.objectContaining({
          errors: {
            list: [
              {
                text: 'Select an option before continuing',
                href: '#mode-specific'
              }
            ]
          }
        })
      )
    })

    it('should handle pollutants with whitespace correctly', () => {
      mockRequest.payload = {
        'pollutant-mode': 'specific',
        selectedPollutants: ['  NO2  ', ' PM10 ', 'O3']
      }

      airpollutantController.handler(mockRequest, mockH)

      expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedPollutants', [
        '  NO2  ',
        ' PM10 ',
        'O3'
      ])
      expect(mockH.redirect).toHaveBeenCalled()
    })
  })
})
