import { downloadDataselectornojsController } from './controller.js'
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

// Mock console methods to prevent test output noise
const originalConsole = console

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
})

afterAll(() => {
  global.console = originalConsole
})

describe('downloadDataselectornojsController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      yar: {
        get: jest.fn()
      }
    }
    mockH = {
      view: jest
        .fn()
        .mockReturnValue('download-dataselector-nojs-view-response')
    }
  })

  it('should render error when selectedyear is missing', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        selectedyear: undefined,
        selectedlocation: ['London'],
        nooflocation: 5,
        selectedpollutant: ['NO2']
      }
      return values[key]
    })

    const result = downloadDataselectornojsController.handler(
      mockRequest,
      mockH
    )

    expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
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
    expect(result).toBe('download-dataselector-nojs-view-response')
  })

  it('should render error when selectedlocation is missing', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        selectedyear: '2023',
        selectedlocation: undefined,
        nooflocation: 5,
        selectedpollutant: ['NO2']
      }
      return values[key]
    })

    const result = downloadDataselectornojsController.handler(
      mockRequest,
      mockH
    )

    expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
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
    expect(result).toBe('download-dataselector-nojs-view-response')
  })

  it('should render error when nooflocation is 0', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        selectedyear: '2023',
        selectedlocation: ['London'],
        nooflocation: 0,
        selectedpollutant: ['NO2'],
        downloadaurnresult: undefined,
        yearrange: undefined,
        finalyear: undefined
      }
      return values[key]
    })

    const result = downloadDataselectornojsController.handler(
      mockRequest,
      mockH
    )

    expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
      pageTitle: 'Download Data Selector',
      heading: 'Download Your Selected Data',
      texts: ['Review your selection', 'Confirm and download'],
      error: true,
      errormsg:
        'There are no stations available based on your selection. Change the year or location',
      errorref1: 'Change the year',
      errorhref1: '/year-aurn',
      errorref2: 'Change the location',
      errorhref2: '/location-aurn',
      selectedpollutant: ['NO2'],
      selectedyear: '2023',
      selectedlocation: ['London'],
      stationcount: 0,
      displayBacklink: true,
      hrefq: '/customdataset'
    })
    expect(result).toBe('download-dataselector-nojs-view-response')
  })

  it('should render success page when all validations pass', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        selectedyear: '2023',
        selectedlocation: ['London'],
        nooflocation: 5,
        selectedpollutant: ['NO2'],
        downloadaurnresult: 'https://api.example.com/download/12345',
        yearrange: 'Multiple',
        finalyear: '2021, 2022, 2023, 2024, 2025'
      }
      return values[key]
    })

    const result = downloadDataselectornojsController.handler(
      mockRequest,
      mockH
    )

    expect(mockH.view).toHaveBeenCalledWith(
      'download_dataselector_nojs/index',
      {
        pageTitle: 'Download Data Selector',
        heading: 'Download Your Selected Data',
        texts: ['Review your selection', 'Confirm and download'],
        downloadaurnresult: 'https://api.example.com/download/12345',
        stationcount: 5,
        yearrange: 'Multiple',
        displayBacklink: true,
        hrefq: '/customdataset',
        finalyear: ['2021', '2022', '2023', '2024', '2025']
      }
    )
    expect(result).toBe('download-dataselector-nojs-view-response')
  })

  it('should handle undefined finalyear and return empty array', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        selectedyear: '2023',
        selectedlocation: ['London'],
        nooflocation: 5,
        selectedpollutant: ['NO2'],
        downloadaurnresult: 'https://api.example.com/download/22222',
        yearrange: 'Single',
        finalyear: undefined
      }
      return values[key]
    })

    downloadDataselectornojsController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'download_dataselector_nojs/index',
      {
        pageTitle: 'Download Data Selector',
        heading: 'Download Your Selected Data',
        texts: ['Review your selection', 'Confirm and download'],
        downloadaurnresult: 'https://api.example.com/download/22222',
        stationcount: 5,
        yearrange: 'Single',
        displayBacklink: true,
        hrefq: '/customdataset',
        finalyear: []
      }
    )
  })

  it('should parse finalyear string with extra whitespace', () => {
    mockRequest.yar.get.mockImplementation((key) => {
      const values = {
        selectedyear: '2023',
        selectedlocation: ['London'],
        nooflocation: 8,
        selectedpollutant: ['NO2'],
        downloadaurnresult: 'https://api.example.com/download/44444',
        yearrange: 'Multiple',
        finalyear: '2020,  2021  , 2022 , 2023'
      }
      return values[key]
    })

    downloadDataselectornojsController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'download_dataselector_nojs/index',
      {
        pageTitle: 'Download Data Selector',
        heading: 'Download Your Selected Data',
        texts: ['Review your selection', 'Confirm and download'],
        downloadaurnresult: 'https://api.example.com/download/44444',
        stationcount: 8,
        yearrange: 'Multiple',
        displayBacklink: true,
        hrefq: '/customdataset',
        finalyear: ['2020', '2021', '2022', '2023']
      }
    )
  })

  describe('Validation Error Cases', () => {
    describe('Missing selectedyear validation', () => {
      it('should render error when selectedyear is undefined', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: undefined,
            selectedlocation: ['London'],
            nooflocation: 5,
            selectedpollutant: ['NO2']
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

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
      })

      it('should render error when selectedyear is null', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: null,
            selectedlocation: ['Manchester'],
            nooflocation: 3,
            selectedpollutant: ['PM10']
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

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
          selectedpollutant: ['PM10'],
          selectedyear: null,
          selectedlocation: ['Manchester'],
          stationcount: 3,
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      })
    })

    describe('Missing selectedlocation validation', () => {
      it('should render error when selectedlocation is undefined', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: '2023',
            selectedlocation: undefined,
            nooflocation: 2,
            selectedpollutant: ['O3']
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

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
          selectedpollutant: ['O3'],
          selectedyear: '2023',
          selectedlocation: undefined,
          stationcount: 2,
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      })

      it('should render error when selectedlocation is null', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: '2024',
            selectedlocation: null,
            nooflocation: 7,
            selectedpollutant: ['SO2']
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

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
          selectedpollutant: ['SO2'],
          selectedyear: '2024',
          selectedlocation: null,
          stationcount: 7,
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      })
    })

    describe('Zero locations validation', () => {
      it('should render error when nooflocation is 0 (number)', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: '2023',
            selectedlocation: ['London'],
            nooflocation: 0,
            selectedpollutant: ['NO2'],
            downloadaurnresult: undefined,
            yearrange: undefined,
            finalyear: undefined
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          error: true,
          errormsg:
            'There are no stations available based on your selection. Change the year or location',
          errorref1: 'Change the year',
          errorhref1: '/year-aurn',
          errorref2: 'Change the location',
          errorhref2: '/location-aurn',
          selectedpollutant: ['NO2'],
          selectedyear: '2023',
          selectedlocation: ['London'],
          stationcount: 0,
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      })

      it('should render error when nooflocation is "0" (string)', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: '2024',
            selectedlocation: ['Manchester'],
            nooflocation: '0',
            selectedpollutant: ['PM10'],
            downloadaurnresult: undefined,
            yearrange: undefined,
            finalyear: undefined
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          error: true,
          errormsg:
            'There are no stations available based on your selection. Change the year or location',
          errorref1: 'Change the year',
          errorhref1: '/year-aurn',
          errorref2: 'Change the location',
          errorhref2: '/location-aurn',
          selectedpollutant: ['PM10'],
          selectedyear: '2024',
          selectedlocation: ['Manchester'],
          stationcount: '0',
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      })

      it('should render error when nooflocation is undefined', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: '2025',
            selectedlocation: ['Birmingham'],
            nooflocation: undefined,
            selectedpollutant: ['O3'],
            downloadaurnresult: undefined,
            yearrange: undefined,
            finalyear: undefined
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          error: true,
          errormsg:
            'There are no stations available based on your selection. Change the year or location',
          errorref1: 'Change the year',
          errorhref1: '/year-aurn',
          errorref2: 'Change the location',
          errorhref2: '/location-aurn',
          selectedpollutant: ['O3'],
          selectedyear: '2025',
          selectedlocation: ['Birmingham'],
          stationcount: undefined,
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      })

      it('should render error when nooflocation is null', () => {
        mockRequest.yar.get.mockImplementation((key) => {
          const values = {
            selectedyear: '2022',
            selectedlocation: ['Leeds'],
            nooflocation: null,
            selectedpollutant: ['CO'],
            downloadaurnresult: undefined,
            yearrange: undefined,
            finalyear: undefined
          }
          return values[key]
        })

        downloadDataselectornojsController.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith('customdataset/index', {
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          error: true,
          errormsg:
            'There are no stations available based on your selection. Change the year or location',
          errorref1: 'Change the year',
          errorhref1: '/year-aurn',
          errorref2: 'Change the location',
          errorhref2: '/location-aurn',
          selectedpollutant: ['CO'],
          selectedyear: '2022',
          selectedlocation: ['Leeds'],
          stationcount: null,
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      })
    })
  })

  describe('Success Cases', () => {
    it('should render download_dataselector_nojs/index view with all session values', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedyear: '2023',
          selectedlocation: ['London'],
          nooflocation: 5,
          downloadaurnresult: 'https://api.example.com/download/12345',
          yearrange: 'Multiple',
          finalyear: '2021, 2022, 2023, 2024, 2025'
        }
        return values[key]
      })

      const result = downloadDataselectornojsController.handler(
        mockRequest,
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Download Data Selector',
          heading: 'Download Your Selected Data',
          texts: ['Review your selection', 'Confirm and download'],
          downloadaurnresult: 'https://api.example.com/download/12345',
          stationcount: 5,
          yearrange: 'Multiple',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2021', '2022', '2023', '2024', '2025']
        }
      )
      expect(result).toBe('download-dataselector-nojs-view-response')
    })

    it('should handle undefined downloadaurnresult', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedyear: '2024',
          selectedlocation: ['Manchester'],
          nooflocation: 3,
          downloadaurnresult: undefined,
          yearrange: 'Single',
          finalyear: '2024'
        }
        return values[key]
      })

      downloadDataselectornojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Download Data Selector',
          heading: 'Download Your Selected Data',
          texts: ['Review your selection', 'Confirm and download'],
          downloadaurnresult: undefined,
          stationcount: 3,
          yearrange: 'Single',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2024']
        }
      )
    })

    it('should handle undefined finalyear and return empty array', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedyear: '2022',
          selectedlocation: ['Birmingham'],
          nooflocation: 7,
          downloadaurnresult: 'https://api.example.com/download/22222',
          yearrange: 'Single',
          finalyear: undefined
        }
        return values[key]
      })

      downloadDataselectornojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Download Data Selector',
          heading: 'Download Your Selected Data',
          texts: ['Review your selection', 'Confirm and download'],
          downloadaurnresult: 'https://api.example.com/download/22222',
          stationcount: 7,
          yearrange: 'Single',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: []
        }
      )
    })

    it('should handle null finalyear and return empty array', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedyear: '2021',
          selectedlocation: ['Leeds'],
          nooflocation: 2,
          downloadaurnresult: 'https://api.example.com/download/33333',
          yearrange: 'Multiple',
          finalyear: null
        }
        return values[key]
      })

      downloadDataselectornojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Download Data Selector',
          heading: 'Download Your Selected Data',
          texts: ['Review your selection', 'Confirm and download'],
          downloadaurnresult: 'https://api.example.com/download/33333',
          stationcount: 2,
          yearrange: 'Multiple',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: []
        }
      )
    })

    it('should parse finalyear string with extra whitespace', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedyear: '2020',
          selectedlocation: ['Bristol'],
          nooflocation: 8,
          downloadaurnresult: 'https://api.example.com/download/44444',
          yearrange: 'Multiple',
          finalyear: '2020,  2021  , 2022 , 2023'
        }
        return values[key]
      })

      downloadDataselectornojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Download Data Selector',
          heading: 'Download Your Selected Data',
          texts: ['Review your selection', 'Confirm and download'],
          downloadaurnresult: 'https://api.example.com/download/44444',
          stationcount: 8,
          yearrange: 'Multiple',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2020', '2021', '2022', '2023']
        }
      )
    })

    it('should handle single year in finalyear', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedyear: '2023',
          selectedlocation: ['Sheffield'],
          nooflocation: 4,
          downloadaurnresult: 'https://api.example.com/download/55555',
          yearrange: 'Single',
          finalyear: '2023'
        }
        return values[key]
      })

      downloadDataselectornojsController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        {
          pageTitle: 'Download Data Selector',
          heading: 'Download Your Selected Data',
          texts: ['Review your selection', 'Confirm and download'],
          downloadaurnresult: 'https://api.example.com/download/55555',
          stationcount: 4,
          yearrange: 'Single',
          displayBacklink: true,
          hrefq: '/customdataset',
          finalyear: ['2023']
        }
      )
    })

    it('should verify all yar.get calls are made', () => {
      mockRequest.yar.get.mockImplementation((key) => {
        const values = {
          selectedyear: '2024',
          selectedlocation: ['London'],
          nooflocation: 10,
          downloadaurnresult: 'test-result',
          yearrange: 'test-range',
          finalyear: '2024'
        }
        return values[key]
      })

      downloadDataselectornojsController.handler(mockRequest, mockH)

      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedyear')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedlocation')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('nooflocation')
      // expect(mockRequest.yar.get).toHaveBeenCalledWith('selectedpollutant')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('downloadaurnresult')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('yearrange')
      expect(mockRequest.yar.get).toHaveBeenCalledWith('finalyear')
    })
  })
})
