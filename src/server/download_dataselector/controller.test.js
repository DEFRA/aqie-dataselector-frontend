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

    // test('should render error when year is missing', () => {
    //   session.selectedpollutant = ['NO2']

    //   const result = downloadDataselectorController.handler(request, h)

    //   expect(result.view).toBe('customdataset/index')
    //   expect(result.model.errormsg).toBe(
    //     'Select a timeperiod to continue'
    //   )
    // })

    test('should render error when location is missing', () => {
      session.selectedpollutant = ['NO2']
      session.selectedyear = '2024'

      const result = downloadDataselectorController.handler(request, h)

      expect(result.view).toBe('customdataset/index')
      expect(result.model.errormsg).toBe('Select a location to continue')
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

    test('should mark station count unavailable when count is null', () => {
      session.nooflocation = null
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.stationCountUnavailable).toBe(true)
    })

    test('should mark station count unavailable when value is Error', () => {
      session.nooflocation = new Error('Failed')
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.stationCountUnavailable).toBe(true)
    })

    test('should mark station count unavailable when value is object', () => {
      session.nooflocation = {
        unexpected: true
      }

      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.stationCountUnavailable).toBe(true)
    })

    test('should keep station count available when count is zero', () => {
      session.nooflocation = 0
      session.datasourceGroups = []

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.stationCountUnavailable).toBe(false)
      expect(result.model.stationcount).toBe(0)
    })

    test('should handle non-array UKEAP data', () => {
      session.nooflocation = 1
      session.datasourceGroups = []
      session.nooflocationukeap = 'invalid'

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.ukeapNetworks).toEqual([])
      expect(result.model.ukeapUnavailable).toBe(true)
    })

    test('should handle category with empty networks', () => {
      session.nooflocation = 1

      session.datasourceGroups = [
        {
          category: 'Other data from Defra',
          networks: []
        },
        {
          category: 'Near real-time data from Defra',
          networks: []
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.ukeapUnavailable).toBe(true)
    })

    test('should handle category mismatch', () => {
      session.nooflocation = 1

      session.datasourceGroups = [
        {
          category: 'Some Other Category',
          networks: [{}]
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.ukeapUnavailable).toBe(true)
      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should handle group without networks property', () => {
      session.nooflocation = 1

      session.datasourceGroups = [
        {
          category: 'Near real-time data from Defra'
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should handle null network values', () => {
      session.nooflocation = 1

      session.datasourceGroups = [
        {
          category: 'Near real-time data from Defra',
          networks: [null]
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should handle non-object network values', () => {
      session.nooflocation = 1

      session.datasourceGroups = [
        {
          category: 'Near real-time data from Defra',
          networks: ['network']
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should return empty pollutant id when network has id', () => {
      session.nooflocation = 1

      session.datasourceGroups = [
        {
          category: 'Near real-time data from Defra',
          networks: [
            {
              id: 'network-1',
              pollutantID: '10'
            }
          ]
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.aurnPollutantID).toBe('')
    })

    test('should return pollutant id when network has no id', () => {
      session.nooflocation = 1

      session.datasourceGroups = [
        {
          category: 'Near real-time data from Defra',
          networks: [
            {
              pollutantID: '25'
            }
          ]
        }
      ]

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.aurnPollutantID).toBe('25')
    })

    test('should default finalyear to empty array', () => {
      session.nooflocation = 1
      session.datasourceGroups = []
      session.finalyear = undefined

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.finalyear).toEqual([])
    })

    test('should split finalyear correctly', () => {
      session.nooflocation = 1
      session.datasourceGroups = []
      session.finalyear = '2020,2021,2022'

      const result = downloadDataselectorController.handler(request, h)

      expect(result.model.finalyear).toEqual(['2020', '2021', '2022'])
    })
  })
})
