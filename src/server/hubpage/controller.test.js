import { hubController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

describe('hubController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      yar: {
        set: jest.fn()
      }
    }
    mockH = {
      view: jest.fn().mockReturnValue('hub-view-response')
    }
  })

  it('should set session values and render the view with correct data', () => {
    const result = hubController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      new Date().getFullYear().toString()
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      new Date().getFullYear().toString()
    )

    expect(mockH.view).toHaveBeenCalledWith('hubpage/index', {
      pageTitle: englishNew.hub.pageTitle,
      texts: englishNew.hub.texts
    })
    expect(result).toBe('hub-view-response')
  })
})
