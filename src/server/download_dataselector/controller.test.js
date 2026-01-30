import { downloadDataselectorController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download']
    }
  }
}))

describe('downloadDataselectorController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = {
      yar: {
        get: jest.fn(),
        set: jest.fn()
      }
    }
    mockH = {
      view: jest.fn().mockReturnValue('download-dataselector-view-response')
    }
  })

  it('renders error when selectedyear is missing', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: undefined,
          selectedlocation: ['London'],
          nooflocation: 5,
          selectedpollutant: ['NO2']
        })[k]
    )

    const result = downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'errorViewData',
      expect.objectContaining({
        error: true,
        errormsg: 'Select a year to continue'
      })
    )
    expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      error: true,
      errormsg: 'Select a year to continue',
      errorref1: 'Add year',
      errorhref1: '/year-aurn',
      errorref2: '',
      errorhref2: '',
      selectedpollutant: ['NO2'],
      selectedyear: undefined,
      selectedlocation: ['London'],
      stationcount: 5,
      displayBacklink: true,
      hrefq: '/customdataset'
    })
    expect(result).toBe('download-dataselector-view-response')
  })

  it('renders error when selectedlocation is missing', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2023',
          selectedlocation: undefined,
          nooflocation: 5,
          selectedpollutant: ['NO2']
        })[k]
    )

    const result = downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'errorViewData',
      expect.objectContaining({
        error: true,
        errormsg: 'Select a location to continue'
      })
    )
    expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      error: true,
      errormsg: 'Select a location to continue',
      errorref1: 'Add location',
      errorhref1: '/location-aurn',
      errorref2: '',
      errorhref2: '',
      selectedpollutant: ['NO2'],
      selectedyear: '2023',
      selectedlocation: undefined,
      stationcount: 5,
      displayBacklink: true,
      hrefq: '/customdataset'
    })
    expect(result).toBe('download-dataselector-view-response')
  })

  it('renders error when nooflocation is 0/“0”/falsy', () => {
    // numeric 0
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2023',
          selectedlocation: ['London'],
          nooflocation: 0,
          selectedpollutant: ['NO2']
        })[k]
    )
    downloadDataselectorController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenLastCalledWith(
      'customdataset/index',
      expect.objectContaining({
        error: true,
        errormsg:
          'There are no stations available based on your selection. Change the year or location',
        errorref1: 'Change the year',
        errorhref1: '/year-aurn',
        errorref2: 'Change the location',
        errorhref2: '/location-aurn'
      })
    )

    // string "0"
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2024',
          selectedlocation: ['Manchester'],
          nooflocation: '0',
          selectedpollutant: ['PM10']
        })[k]
    )
    downloadDataselectorController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenLastCalledWith(
      'customdataset/index',
      expect.objectContaining({
        error: true,
        errormsg:
          'There are no stations available based on your selection. Change the year or location'
      })
    )

    // undefined
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2025',
          selectedlocation: ['Birmingham'],
          nooflocation: undefined,
          selectedpollutant: ['O3']
        })[k]
    )
    downloadDataselectorController.handler(mockRequest, mockH)
    expect(mockH.view).toHaveBeenLastCalledWith(
      'customdataset/index',
      expect.objectContaining({
        error: true,
        errormsg:
          'There are no stations available based on your selection. Change the year or location'
      })
    )
  })

  it('renders success page when all validations pass', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2023',
          selectedlocation: ['London'],
          nooflocation: 5,
          selectedpollutant: ['NO2'],
          downloadaurnresult: 'https://api.example.com/download/12345',
          yearrange: 'Multiple',
          finalyear: '2021, 2022, 2023, 2024, 2025'
        })[k]
    )

    const result = downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'downloadViewData',
      expect.objectContaining({
        pageTitle: englishNew.custom.pageTitle,
        downloadaurnresult: 'https://api.example.com/download/12345',
        stationcount: 5,
        yearrange: 'Multiple',
        finalyear: ['2021', '2022', '2023', '2024', '2025'],
        displayBacklink: true,
        hrefq: '/customdataset'
      })
    )
    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: 'https://api.example.com/download/12345',
      stationcount: 5,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2021', '2022', '2023', '2024', '2025']
    })
    expect(result).toBe('download-dataselector-view-response')
  })

  it('handles undefined finalyear -> empty array', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2023',
          selectedlocation: ['London'],
          nooflocation: 5,
          downloadaurnresult: 'https://api.example.com/download/22222',
          yearrange: 'Single',
          finalyear: undefined
        })[k]
    )

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: 'https://api.example.com/download/22222',
      stationcount: 5,
      yearrange: 'Single',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: []
    })
  })

  it('parses finalyear string with extra whitespace', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2020',
          selectedlocation: ['Bristol'],
          nooflocation: 8,
          downloadaurnresult: 'https://api.example.com/download/44444',
          yearrange: 'Multiple',
          finalyear: '2020,  2021  , 2022 , 2023'
        })[k]
    )

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: 'https://api.example.com/download/44444',
      stationcount: 8,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2020', '2021', '2022', '2023']
    })
  })

  it('handles single year in finalyear', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2023',
          selectedlocation: ['Sheffield'],
          nooflocation: 4,
          downloadaurnresult: 'https://api.example.com/download/55555',
          yearrange: 'Single',
          finalyear: '2023'
        })[k]
    )

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: 'https://api.example.com/download/55555',
      stationcount: 4,
      yearrange: 'Single',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2023']
    })
  })

  it('verifies all yar.get calls are made', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2024',
          selectedlocation: ['London'],
          nooflocation: 10,
          downloadaurnresult: 'test-result',
          yearrange: 'test-range',
          finalyear: '2024'
        })[k]
    )

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedyear')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedlocation')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('nooflocation')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('downloadaurnresult')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('yearrange')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('finalyear')
  })

  it('stores downloadViewData in session on success', () => {
    mockRequest.yar.get.mockImplementation(
      (k) =>
        ({
          selectedyear: '2023',
          selectedlocation: ['London'],
          nooflocation: 5,
          downloadaurnresult: 'https://api.example.com/download/12345',
          yearrange: 'Multiple',
          finalyear: '2021, 2022, 2023, 2024, 2025'
        })[k]
    )

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockRequest.yar.set).toHaveBeenCalledWith(
      'downloadViewData',
      expect.objectContaining({
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        downloadaurnresult: 'https://api.example.com/download/12345',
        stationcount: 5,
        yearrange: 'Multiple',
        displayBacklink: true,
        hrefq: '/customdataset',
        finalyear: ['2021', '2022', '2023', '2024', '2025']
      })
    )
  })
})
