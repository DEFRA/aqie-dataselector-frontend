import { datasourceController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

// Mock the content module
jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Data Source Page',
      heading: 'Test Data Source Heading',
      texts: 'Test Data Source Texts'
    }
  }
}))

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
      view: jest.fn().mockReturnValue('datasource-view-response')
    }
  })

  it('should set session values and render the view with correct data', async () => {
    const result = await datasourceController.handler(mockRequest, mockH)
    const currentYear = new Date().getFullYear().toString()

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      currentYear
    )

    expect(mockH.view).toHaveBeenCalledWith('datasource/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      displayBacklink: true,
      hrefq: '/customdataset'
    })
    expect(result).toBe('datasource-view-response')
  })

  it('should set all session variables in correct order', async () => {
    await datasourceController.handler(mockRequest, mockH)
    const currentYear = new Date().getFullYear().toString()

    expect(mockRequest.yar.set).toHaveBeenCalledTimes(8)
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(1, 'searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      2,
      'fullSearchQuery',
      null
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(3, 'searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      4,
      'osnameapiresult',
      ''
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      5,
      'selectedLocation',
      ''
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(6, 'nooflocation', '')
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      7,
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenNthCalledWith(
      8,
      'selectedYear',
      currentYear
    )
  })

  it('should not set selectedpollutant since that code is commented out', async () => {
    await datasourceController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      expect.anything()
    )
  })

  it('should work with params.pollutants defined', async () => {
    mockRequest.params.pollutants = 'NO2,PM10,O3'
    await datasourceController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      'NO2,PM10,O3'
    )
  })

  it('should work with undefined params.pollutants', async () => {
    mockRequest.params.pollutants = undefined
    await datasourceController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).not.toHaveBeenCalledWith(
      'selectedpollutant',
      expect.anything()
    )
  })

  it('should set correct backUrl and render properties', async () => {
    await datasourceController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({
        pageTitle: 'Test Data Source Page',
        heading: 'Test Data Source Heading',
        texts: 'Test Data Source Texts',
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    )
  })

  it('should render view with all required properties', async () => {
    const result = await datasourceController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('datasource/index', {
      pageTitle: expect.any(String),
      heading: expect.any(String),
      texts: expect.any(String),
      displayBacklink: true,
      hrefq: '/customdataset'
    })
    expect(result).toBe('datasource-view-response')
  })

  it('should handle missing params object', async () => {
    delete mockRequest.params
    const result = await datasourceController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalled()
    expect(result).toBe('datasource-view-response')
  })

  it('should handle null params object', async () => {
    mockRequest.params = null
    const result = await datasourceController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalled()
    expect(result).toBe('datasource-view-response')
  })

  it('should use consistent backUrl throughout', async () => {
    await datasourceController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'datasource/index',
      expect.objectContaining({ hrefq: '/customdataset' })
    )
  })

  it('should use current year for yearselected and selectedYear', async () => {
    const currentYear = new Date().getFullYear().toString()
    await datasourceController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'yearselected',
      currentYear
    )
    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'selectedYear',
      currentYear
    )
  })

  it('should reset search-related session variables', async () => {
    await datasourceController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('fullSearchQuery', null)
    expect(mockRequest.yar.set).toHaveBeenCalledWith('searchLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('osnameapiresult', '')
  })

  it('should reset location-related session variables', async () => {
    await datasourceController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith('selectedLocation', '')
    expect(mockRequest.yar.set).toHaveBeenCalledWith('nooflocation', '')
  })

  it('should handle missing yar object', async () => {
    mockRequest.yar = null

    await expect(
      datasourceController.handler(mockRequest, mockH)
    ).rejects.toThrow()
  })

  it('should handle missing h.view function', async () => {
    mockH.view = null

    await expect(
      datasourceController.handler(mockRequest, mockH)
    ).rejects.toThrow()
  })
})
