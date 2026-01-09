import { datasourceController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

describe('datasourceController', () => {
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
      view: jest.fn().mockReturnValue('view-response')
    }
  })

  it('should set session values and render the view with correct data', () => {
    const result = datasourceController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      new Date().getFullYear().toString()
    )
    expect(mockH.view).toHaveBeenCalledWith('datasource/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts
      // selectedpollutant: undefined
    })
    expect(result).toBe('view-response')
  })

  it('should not set selectedpollutant if params.pollutants is undefined', () => {
    datasourceController.handler(mockRequest, mockH)
    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      expect.anything()
    )
  })

  it('should work if params.pollutants is defined (commented code)', () => {
    mockRequest.params.pollutants = 'NO2'
    datasourceController.handler(mockRequest, mockH)
    // The code for selectedpollutant is commented out, so nothing should happen
    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      'NO2'
    )
  })
})
