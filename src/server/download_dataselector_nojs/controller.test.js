import { downloadDataselectornojsController } from './controller.js'
import { englishNew } from '~/src/server/data/en/content_aurn.js'

jest.mock('~/src/server/data/en/content_aurn.js', () => ({
  englishNew: {
    custom: {
      pageTitle: 'Download Page',
      heading: 'Download heading',
      texts: ['Some text']
    }
  }
}))

describe('downloadDataselectornojsController', () => {
  let request
  let h

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => undefined) // silence controller debug log

    const session = {}
    request = {
      method: 'get',
      yar: {
        get: jest.fn((k) => session[k]),
        set: jest.fn((k, v) => {
          session[k] = v
        }),
        clear: jest.fn()
      },
      headers: {},
      info: {},
      path: '/download-data'
    }
    h = {
      view: jest.fn().mockReturnValue('view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET', () => {
    it('renders index with coerced stationcount from nooflocation and finalyear split', () => {
      // Arrange session
      request.yar.set('downloadaurnresult', 'https://example.com/file.csv')
      request.yar.set('nooflocation', '4') // string -> coerced to number 4
      request.yar.set('yearrange', 'Single')
      request.yar.set('finalyear', '2019, 2020')

      // Act
      const res = downloadDataselectornojsController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          downloadaurnresult: 'https://example.com/file.csv',
          stationcount: 4,
          yearrange: 'Single',
          hrefq: '/customdataset',
          finalyear: ['2019', '2020']
        })
      )
      expect(res).toBe('view-response')
    })

    it('falls back to stationcount when nooflocation is missing', () => {
      request.yar.set('stationcount', '3') // fallback key
      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({
          stationcount: 3,
          finalyear: []
        })
      )
      expect(res).toBe('view-response')
    })

    it('handles missing finalyear by passing empty array', () => {
      const res = downloadDataselectornojsController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({ finalyear: [] })
      )
      expect(res).toBe('view-response')
    })

    it('sets aurnPollutantID and marks UKEAP available when datasource groups and networks exist', () => {
      request.yar.set('datasourceGroups', [
        {
          category: 'Other data from Defra',
          networks: [{ id: 'aurn-network' }, { pollutantID: 'NO2' }]
        }
      ])
      request.yar.set('nooflocationukeap', ['UKA1'])

      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({
          aurnPollutantID: 'NO2',
          ukeapNetworks: ['UKA1'],
          ukeapUnavailable: false
        })
      )
      expect(res).toBe('view-response')
    })
  })

  describe('POST validation', () => {
    beforeEach(() => {
      request.method = 'post'
    })

    it('returns error view when selectedpollutant is missing', () => {
      // year and location present, pollutant missing
      request.yar.set('selectedyear', '2024')
      request.yar.set('selectedlocation', ['Somewhere'])

      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a pollutant to continue',
          errorref1: 'Add pollutant',
          errorhref1: '/airpollutant/nojs'
        })
      )
      expect(res).toBe('view-response')
    })

    it('returns error view when selectedyear is missing', () => {
      // selectedlocation present, selectedyear missing
      request.yar.set('selectedpollutant', ['NO2'])
      request.yar.set('selectedlocation', ['Somewhere'])

      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a year to continue',
          errorref1: 'Add year',
          errorhref1: '/year-aurn',
          selectedpollutant: ['NO2'],
          selectedlocation: ['Somewhere']
        })
      )
      expect(res).toBe('view-response')
    })

    it('returns error view when selectedlocation is missing', () => {
      // selectedyear present, selectedlocation missing
      request.yar.set('selectedpollutant', ['PM10'])
      request.yar.set('selectedyear', '2024')

      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a location to continue',
          errorref1: 'Add location',
          errorhref1: '/location-aurn/nojs',
          selectedpollutant: ['PM10'],
          selectedyear: '2024'
        })
      )
      expect(res).toBe('view-response')
    })

    it('renders download page with stationcount 0 when nooflocation is 0', () => {
      request.yar.set('selectedpollutant', ['SO2'])
      request.yar.set('selectedyear', '2024')
      request.yar.set('selectedlocation', ['A'])
      request.yar.set('nooflocation', 0)

      const res = downloadDataselectornojsController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({ stationcount: 0 })
      )
      expect(res).toBe('view-response')
    })

    it('renders download page with stationcount 0 when nooflocation is string "0"', () => {
      request.yar.set('selectedpollutant', ['SO2'])
      request.yar.set('selectedyear', '2024')
      request.yar.set('selectedlocation', ['A'])
      request.yar.set('nooflocation', '0')

      downloadDataselectornojsController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({ stationcount: 0 })
      )
    })

    it('renders download page with stationcount 0 when nooflocation is missing', () => {
      request.yar.set('selectedpollutant', ['SO2'])
      request.yar.set('selectedyear', '2024')
      request.yar.set('selectedlocation', ['A'])

      downloadDataselectornojsController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({ stationcount: 0 })
      )
    })
  })

  describe('POST success', () => {
    beforeEach(() => {
      request.method = 'post'
    })

    it('renders download page with numeric stationcount and other fields', () => {
      request.yar.set('selectedpollutant', ['CO'])
      request.yar.set('selectedyear', '2024')
      request.yar.set('selectedlocation', ['A'])
      request.yar.set('nooflocation', '4') // string -> number
      request.yar.set('downloadaurnresult', 'https://example.com/file.csv')
      request.yar.set('yearrange', 'Multiple')
      request.yar.set('finalyear', '2020,2022')

      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({
          pageTitle: englishNew.custom.pageTitle,
          heading: englishNew.custom.heading,
          texts: englishNew.custom.texts,
          downloadaurnresult: 'https://example.com/file.csv',
          stationcount: 4,
          yearrange: 'Multiple',
          hrefq: '/customdataset',
          finalyear: ['2020', '2022']
        })
      )
      expect(res).toBe('view-response')
    })

    it('passes no-JS override flags and uses downloadDatasourceGroups when forced', () => {
      request.yar.set('selectedpollutant', ['NO2'])
      request.yar.set('selectedyear', 'Last 7 days')
      request.yar.set('selectedlocation', ['A'])

      request.yar.set('downloadForceNearRealtimeOnly', true)
      request.yar.set('downloadDatasourceCategoryType', 'near-realtime-only')
      request.yar.set('TimeSelectionMode', 'last7days')
      request.yar.set('downloadDatasourceGroups', [
        {
          category: 'Near real-time data from Defra',
          networks: [{ pollutantID: 'NO2' }]
        }
      ])
      request.yar.set('datasourceGroups', [
        {
          category: 'Other data from Defra',
          networks: [{ pollutantID: 'SO2' }]
        }
      ])

      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({
          downloadForceNearRealtimeOnly: true,
          datasourceCategoryType: 'near-realtime-only',
          TimeSelectionMode: 'last7days',
          selectedyear: 'Last 7 days',
          datasourceGroups: [
            {
              category: 'Near real-time data from Defra',
              networks: [{ pollutantID: 'NO2' }]
            }
          ]
        })
      )
      expect(res).toBe('view-response')
    })

    it('uses datasourceGroups and datasourceCategoryType when force flag is false', () => {
      request.yar.set('selectedpollutant', ['NO2'])
      request.yar.set('selectedyear', '2024')
      request.yar.set('selectedlocation', ['A'])

      request.yar.set('downloadForceNearRealtimeOnly', false)
      request.yar.set('downloadDatasourceCategoryType', '')
      request.yar.set('datasourceCategoryType', 'both')
      request.yar.set('datasourceGroups', [
        {
          category: 'Near real-time data from Defra',
          networks: [{ pollutantID: 'NO2' }]
        },
        {
          category: 'Other data from Defra',
          networks: [{ pollutantID: 'SO2' }]
        }
      ])

      downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector_nojs/index',
        expect.objectContaining({
          downloadForceNearRealtimeOnly: false,
          datasourceCategoryType: 'both',
          datasourceGroups: [
            {
              category: 'Near real-time data from Defra',
              networks: [{ pollutantID: 'NO2' }]
            },
            {
              category: 'Other data from Defra',
              networks: [{ pollutantID: 'SO2' }]
            }
          ]
        })
      )
    })
  })
})
