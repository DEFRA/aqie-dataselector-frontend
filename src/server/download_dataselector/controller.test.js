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
    mockRequest = {
      yar: {
        get: jest.fn()
      }
    }
    mockH = {
      view: jest.fn().mockReturnValue('download-dataselector-view-response')
    }
  })

  it('should render download_dataselector/index view with all session values', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/12345',
        nooflocation: 5,
        yearrange: 'Multiple',
        finalyear: '2021, 2022, 2023, 2024, 2025'
      }
      return values[key]
    })

    const result = downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/12345',
      stationcount: 5,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2021', '2022', '2023', '2024', '2025']
    })
    expect(result).toBe('download-dataselector-view-response')
  })

  it('should handle undefined downloadaurnresult', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: undefined,
        nooflocation: 3,
        yearrange: 'Single',
        finalyear: '2024'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: undefined,
      stationcount: 3,
      yearrange: 'Single',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2024']
    })
  })

  it('should handle undefined nooflocation', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/67890',
        nooflocation: undefined,
        yearrange: 'Multiple',
        finalyear: '2022, 2023'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/67890',
      stationcount: undefined,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2022', '2023']
    })
  })

  it('should handle undefined yearrange', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/11111',
        nooflocation: 10,
        yearrange: undefined,
        finalyear: '2024'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/11111',
      stationcount: 10,
      yearrange: undefined,
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2024']
    })
  })

  it('should handle undefined finalyear and return empty array', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/22222',
        nooflocation: 7,
        yearrange: 'Single',
        finalyear: undefined
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/22222',
      stationcount: 7,
      yearrange: 'Single',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: []
    })
  })

  it('should handle null finalyear and return empty array', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/33333',
        nooflocation: 2,
        yearrange: 'Multiple',
        finalyear: null
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/33333',
      stationcount: 2,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: []
    })
  })

  it('should parse finalyear string with extra whitespace', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/44444',
        nooflocation: 8,
        yearrange: 'Multiple',
        finalyear: '2020,  2021  , 2022 , 2023'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/44444',
      stationcount: 8,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2020', '2021', '2022', '2023']
    })
  })

  it('should handle single year in finalyear', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/55555',
        nooflocation: 4,
        yearrange: 'Single',
        finalyear: '2023'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/55555',
      stationcount: 4,
      yearrange: 'Single',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2023']
    })
  })

  it('should handle all undefined values', () => {
    mockRequest.yar.get.mockReturnValue(undefined)

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: undefined,
      stationcount: undefined,
      yearrange: undefined,
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: []
    })
  })

  it('should pass englishNew.custom properties correctly', () => {
    mockRequest.yar.get.mockReturnValue(undefined)

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: englishNew.custom.pageTitle,
      heading: englishNew.custom.heading,
      texts: englishNew.custom.texts,
      downloadaurnresult: undefined,
      stationcount: undefined,
      yearrange: undefined,
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: []
    })
  })

  it('should call h.view with correct template path', () => {
    mockRequest.yar.get.mockReturnValue(undefined)

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'download_dataselector/index',
      expect.any(Object)
    )
  })

  it('should return the result of h.view', () => {
    mockRequest.yar.get.mockReturnValue(undefined)

    const result = downloadDataselectorController.handler(mockRequest, mockH)

    expect(result).toBe('download-dataselector-view-response')
  })

  it('should handle finalyear with multiple years and spaces', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/66666',
        nooflocation: 1,
        yearrange: 'Multiple',
        finalyear: '2021, 2022, 2023, 2024, 2025, 2026'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/66666',
      stationcount: 1,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2021', '2022', '2023', '2024', '2025', '2026']
    })
  })

  it('should handle empty string for finalyear', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/77777',
        nooflocation: 6,
        yearrange: 'Single',
        finalyear: ''
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/77777',
      stationcount: 6,
      yearrange: 'Single',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['']
    })
  })

  it('should trim whitespace correctly from each year', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/88888',
        nooflocation: 9,
        yearrange: 'Multiple',
        finalyear: '  2019  ,  2020  ,  2021  '
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/88888',
      stationcount: 9,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2019', '2020', '2021']
    })
  })

  it('should get nooflocation and map to stationcount', () => {
    const nooflocationValue = 42
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'https://api.example.com/download/99999',
        nooflocation: nooflocationValue,
        yearrange: 'Multiple',
        finalyear: '2020, 2021'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockRequest.yar.get).toHaveBeenCalledWith('nooflocation')
    expect(mockH.view).toHaveBeenCalledWith('download_dataselector/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      downloadaurnresult: 'https://api.example.com/download/99999',
      stationcount: nooflocationValue,
      yearrange: 'Multiple',
      displayBacklink: true,
      hrefq: '/customdataset',
      finalyear: ['2020', '2021']
    })
  })

  it('should get all session values via yar.get', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        downloadaurnresult: 'test-result',
        nooflocation: 5,
        yearrange: 'test-range',
        finalyear: '2024'
      }
      return values[key]
    })

    downloadDataselectorController.handler(mockRequest, mockH)

    expect(mockRequest.yar.get).toHaveBeenCalledWith('downloadaurnresult')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('nooflocation')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('yearrange')
    expect(mockRequest.yar.get).toHaveBeenCalledWith('finalyear')
  })
})
