import { locationaurnController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

describe('locationaurnController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      yar: {
        set: jest.fn(),
        get: jest.fn()
      },
      params: {}
    }
    mockH = {
      view: jest.fn().mockReturnValue('location-aurn-view-response')
    }
  })

  it('should set session values and render the view with correct data', () => {
    const result = locationaurnController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')

    expect(mockH.view).toHaveBeenCalledWith('location_aurn/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: '/customdataset'
      // selectedpollutant: undefined (commented out in controller)
    })
    expect(result).toBe('location-aurn-view-response')
  })

  it('should not set selectedpollutant if params.pollutants is undefined', () => {
    locationaurnController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      expect.anything()
    )
  })

  it('should set displayBacklink to true and hrefq to correct back URL', () => {
    locationaurnController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'location_aurn/index',
      expect.objectContaining({
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    )
  })

  // Uncomment and adapt this test if you enable the selectedpollutant logic in your controller
  // it('should set selectedpollutant if params.pollutants is defined', () => {
  //   mockRequest.params.pollutants = 'NO2'
  //   locationaurnController.handler(mockRequest, mockH)
  //   expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedpollutant', 'NO2')
  // })
})
