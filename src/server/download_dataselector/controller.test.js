import { downloadDataselectorController } from './controller.js'

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Test Page Title',
      heading: 'Test Heading',
      texts: {
        intro: 'test'
      }
    }
  }
}))

jest.mock('~/src/server/data/en/network-descriptions.js', () => ({
  networkDescriptions: {
    TEST_NETWORK: 'Test Network Description'
  }
}))

describe('downloadDataselectorController', () => {
  let session
  let request
  let h

  beforeEach(() => {
    session = {}

    request = {
      yar: {
        get: jest.fn((key) => session[key]),
        set: jest.fn((key, value) => {
          session[key] = value
        })
      }
    }

    h = {
      view: jest.fn((view, model) => ({
        view,
        model
      }))
    }
  })

  describe('validation errors', () => {
    test('should render error when pollutant is missing', () => {
      const result = downloadDataselectorController.handler(request, h)

      expect(result.view).toBe('customdataset/index')
      expect(result.model.error).toBe(true)
      expect(result.model.errormsg).toBe('Select a pollutant to continue')

      expect(request.yar.set).toHaveBeenCalledWith(
        'errorViewData',
        expect.any(Object)
      )
    })

    test('should render error when year is missing', () => {
      session.selectedpollutant = ['NO2']

      const result = downloadDataselectorController.handler(request, h)

      expect(result.view).toBe('customdataset/index')
      expect(result.model.errormsg).toBe('Select a timeperiod to continue')
      expect(result.model.errorref1).toBe('Add timeperiod')
      expect(result.model.errorhref1).toBe('/year-aurn')
    })

    test('should render error when location is missing', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'

      const result = downloadDataselectorController.handler(request, h)

      expect(result.view).toBe('customdataset/index')
      expect(result.model.errormsg).toBe('Select a location to continue')
    })

    test('should store errorViewData when year is missing', () => {
      session.selectedpollutant = ['NO2']

      downloadDataselectorController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith(
        'errorViewData',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a timeperiod to continue',
          errorref1: 'Add timeperiod',
          errorhref1: '/year-aurn'
        })
      )
    })

    test('should store errorViewData when location is missing', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'

      downloadDataselectorController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith(
        'errorViewData',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a location to continue',
          errorref1: 'Add location',
          errorhref1: '/location-aurn/change'
        })
      )
    })
  })

  describe('successful rendering', () => {
    beforeEach(() => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.yearrange = '2020-2024'
      session.finalyear = '2023, 2024'
      session.Datasourceavailability = true
      session.TimeSelectionMode = 'RANGE'
    })

    test('should render success page with AURN and UKEAP available', () => {
      session.nooflocation = 10

      session.datasourceGroups = [
        {
          category: 'Near real-time data from Defra',
          networks: [
            {
              pollutantID: '8'
            }
          ]
        },
        {
          category: 'Other data from Defra',
          networks: [
            {
              id: 'network-1'
            }
          ]
        }
      ]

      session.nooflocationukeap = [
        {
          networkType: 'UKEAP',
          count: 4
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.view).toBe('download_dataselector/index')

      expect(result.model.stationcount).toBe(10)
      expect(result.model.stationCountUnavailable).toBe(false)
      expect(result.model.ukeapUnavailable).toBe(false)
      expect(result.model.aurnPollutantID).toBe('8')

      expect(result.model.finalyear).toEqual(['2023', '2024'])

      expect(request.yar.set).toHaveBeenCalledWith('downloadaurnresult', null)

      expect(request.yar.set).toHaveBeenCalledWith(
        'downloadViewData',
        expect.any(Object)
      )
    })

    test('should handle undefined datasourceGroups', () => {
      session.nooflocation = 5
      session.datasourceGroups = undefined

      const result = downloadDataselectorController.handler(request, h)

      expect(result.view).toBe('download_dataselector/index')

      expect(result.model.ukeapUnavailable).toBe(true)
      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should handle empty datasourceGroups array', () => {
      session.nooflocation = 5
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.ukeapUnavailable).toBe(true)
      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should mark station count unavailable when stationCountError exists', () => {
      session.nooflocation = 10
      session.stationCountError = true
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.stationCountUnavailable).toBe(true)
      expect(result.model.stationcount).toBeNull()
    })

    test('should mark station count unavailable when nooflocation is plain object', () => {
      session.nooflocation = { bad: true }
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.stationCountUnavailable).toBe(true)
      expect(result.model.stationcount).toBeNull()
    })

    test('should keep station count available when nooflocation is array', () => {
      session.nooflocation = [{ networkType: 'UKEAP', count: 2 }]
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.stationCountUnavailable).toBe(false)
      expect(result.model.stationcount).toEqual([
        { networkType: 'UKEAP', count: 2 }
      ])
    })

    test('should normalize datasourceGroups to [] when session value is non-array', () => {
      session.nooflocation = 5
      session.datasourceGroups = { category: 'Other data from Defra' }

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.ukeapUnavailable).toBe(true)
      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should set ukeapUnavailable=false when Other data source and ukeap networks exist', () => {
      session.nooflocation = 5
      session.datasourceGroups = [
        { category: 'Other data from Defra', networks: [{ id: 'n1' }] }
      ]
      session.nooflocationukeap = [{ networkType: 'UKEAP', count: 4 }]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.ukeapUnavailable).toBe(false)
      expect(result.model.ukeapNetworks).toEqual([
        { networkType: 'UKEAP', count: 4 }
      ])
    })

    test('should include networkDescriptions in success view model', () => {
      session.nooflocation = 10
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.view).toBe('download_dataselector/index')
      expect(result.model.networkDescriptions).toEqual({
        TEST_NETWORK: 'Test Network Description'
      })
    })

    test('should clear download result before rendering success', () => {
      session.nooflocation = 1
      session.datasourceGroups = []

      downloadDataselectorController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith('downloadaurnresult', null)
    })

    test('should trim and split finalyear values', () => {
      session.nooflocation = 1
      session.datasourceGroups = []
      session.finalyear = '2020,  2021 ,2022'

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.finalyear).toEqual(['2020', '2021', '2022'])
    })

    test('should render other-only last7days error', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.TimeSelectionMode = 'last7days'
      session.downloadDatasourceCategoryType = 'other-only'
      session.nooflocationukeap = [{ count: 10 }]
      const result = downloadDataselectorController.handler(request, h)
      expect(result.view).toBe('customdataset/index')
      expect(result.model.error).toBe(true)
      expect(result.model.errormsg).toBe(
        'There are no stations available based on your selection. Change the time period'
      )
    })

    test('should render error for near-realtime-only when station count is zero', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.downloadDatasourceCategoryType = 'near-realtime-only'
      session.nooflocation = 0
      const result = downloadDataselectorController.handler(request, h)
      expect(result.view).toBe('customdataset/index')
      expect(result.model.error).toBe(true)
      expect(result.model.errormsg).toBe(
        'No monitoring stations are available for your selection. Please try:'
      )
    })

    test('should render error for near-realtime-only when station count is empty string', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.downloadDatasourceCategoryType = 'near-realtime-only'
      session.nooflocation = ''
      const result = downloadDataselectorController.handler(request, h)
      expect(result.model.error).toBe(true)
    })

    test('should render error for other-only when all nonaurn counts are zero', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.downloadDatasourceCategoryType = 'other-only'
      session.nooflocationukeap = [{ count: 0 }, { count: 0 }]
      const result = downloadDataselectorController.handler(request, h)
      expect(result.view).toBe('customdataset/index')
      expect(result.model.error).toBe(true)
    })

    test('should render success for other-only when nonaurn count exists', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.downloadDatasourceCategoryType = 'other-only'
      session.nooflocationukeap = [
        {
          networkType: 'UKEAP',
          count: 5
        }
      ]
      const result = downloadDataselectorController.handler(request, h)
      expect(result.view).toBe('download_dataselector/index')
    })

    test('should render error for both datasource when all counts unavailable', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.downloadDatasourceCategoryType = 'both'
      session.nooflocation = 0
      session.nooflocationukeap = [
        {
          networkType: 'UKEAP',
          count: 0
        }
      ]
      const result = downloadDataselectorController.handler(request, h)
      expect(result.view).toBe('customdataset/index')
      expect(result.model.error).toBe(true)
    })

    test('should render success for both datasource when counts exist', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.downloadDatasourceCategoryType = 'both'
      session.nooflocation = 5
      session.nooflocationukeap = [
        {
          networkType: 'UKEAP',
          count: 3
        }
      ]
      const result = downloadDataselectorController.handler(request, h)
      expect(result.view).toBe('download_dataselector/index')
    })

    test('should mark station count unavailable when nooflocation is Error instance', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.nooflocation = new Error('failure')
      session.datasourceGroups = []
      const result = downloadDataselectorController.handler(request, h)
      expect(result.model.stationCountUnavailable).toBe(true)
    })

    test('should handle undefined nooflocationukeap', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.nooflocation = 10
      session.datasourceGroups = []
      const result = downloadDataselectorController.handler(request, h)
      expect(result.view).toBe('download_dataselector/index')
    })

    test('should get empty finalyear array when finalyear not present', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'
      session.selectedlocation = 'London'
      session.nooflocation = 10
      session.datasourceGroups = []
      session.finalyear = undefined
      const result = downloadDataselectorController.handler(request, h)
      expect(result.model.finalyear).toEqual([])
    })

    test('should clear downloadaurnresult and persist downloadViewData', () => {
      session.nooflocation = 1
      session.datasourceGroups = []

      downloadDataselectorController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalledWith('downloadaurnresult', null)
      expect(request.yar.set).toHaveBeenCalledWith(
        'downloadViewData',
        expect.objectContaining({
          pageTitle: 'Test Page Title',
          heading: 'Test Heading',
          hrefq: '/customdataset'
        })
      )
    })
  })
})
