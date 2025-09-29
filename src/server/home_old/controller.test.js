import { homeControllerOld } from '~/src/server/home_old/controller.js'
import { english } from '~/src/server/data/en/homecontent.js'

describe('homeControllerOld.handler', () => {
  const mockRequest = {
    yar: {
      set: jest.fn()
    }
  }

  const mockResponseToolkit = {
    view: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should set session values and render the home view with correct content', () => {
    const result = homeControllerOld.handler(mockRequest, mockResponseToolkit)

    // Check session values
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('yearselected', '2024')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedYear', '2025')

    // Check view rendering
    expect(mockResponseToolkit.view).toHaveBeenCalledWith('home/index', {
      pageTitle: english.home.pageTitle,
      heading: english.home.heading,
      text: english.home.texts,
      links: english.home.links,
      buttontxt: english.home.buttonText,
      subheading: english.home.subheading
    })

    expect(result).toEqual(mockResponseToolkit.view.mock.results[0].value)
  })
})
