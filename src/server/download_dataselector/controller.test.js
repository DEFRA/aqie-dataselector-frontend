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

const makeRequest = (sessionData = {}) => ({
  yar: {
    get: jest.fn((key) =>
      Object.prototype.hasOwnProperty.call(sessionData, key)
        ? sessionData[key]
        : null
    ),
    set: jest.fn()
  }
})

const makeH = () => ({
  view: jest.fn().mockReturnValue('view-response')
})

// Minimal valid session — all three required fields present, station count available
const validSession = {
  selectedpollutant: ['NO2'],
  selectedyear: '2023',
  selectedlocation: ['London'],
  nooflocation: 5,
  stationCountError: false,
  datasourceGroups: [],
  nooflocationukeap: null,
  yearrange: 'Single',
  finalyear: '2023'
}

describe('downloadDataselectorController', () => {
  describe('pollutant validation', () => {
    it('renders error when selectedpollutant is null', () => {
      const request = makeRequest({ ...validSession, selectedpollutant: null })
      const h = makeH()
      const result = downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a pollutant to continue',
          errorref1: 'Add pollutant',
          errorhref1: '/airpollutant',
          errorref2: '',
          errorhref2: ''
        })
      )
      expect(result).toBe('view-response')
    })

    it('renders error when selectedpollutant is an empty array', () => {
      const request = makeRequest({ ...validSession, selectedpollutant: [] })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a pollutant to continue'
        })
      )
    })

    it('stores errorViewData in session on pollutant error', () => {
      const request = makeRequest({ ...validSession, selectedpollutant: null })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(request.yar.set).toHaveBeenCalledWith(
        'errorViewData',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a pollutant to continue'
        })
      )
    })

    it('includes stationcountukeap and datasourceGroups in error view', () => {
      const request = makeRequest({
        ...validSession,
        selectedpollutant: null,
        nooflocationukeap: [{ networkType: 'UKEAP', count: 3 }],
        datasourceGroups: [
          { category: 'Other data from Defra', networks: ['UKEAP'] }
        ]
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({
          stationcountukeap: [{ networkType: 'UKEAP', count: 3 }],
          datasourceGroups: [
            { category: 'Other data from Defra', networks: ['UKEAP'] }
          ]
        })
      )
    })

    it('defaults datasourceGroups to [] in error view when session is null', () => {
      const request = makeRequest({
        ...validSession,
        selectedpollutant: null,
        datasourceGroups: null
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'customdataset/index',
        expect.objectContaining({ datasourceGroups: [] })
      )
    })
  })

  describe('year validation', () => {
    it('renders error when selectedyear is missing', () => {
      const request = makeRequest({ ...validSession, selectedyear: null })
      const h = makeH()
      const result = downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith('customdataset/index', {
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
        selectedyear: null,
        selectedlocation: ['London'],
        stationcount: 5,
        stationcountukeap: null,
        datasourceGroups: [],
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('view-response')
    })

    it('stores errorViewData in session on year error', () => {
      const request = makeRequest({ ...validSession, selectedyear: null })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(request.yar.set).toHaveBeenCalledWith(
        'errorViewData',
        expect.objectContaining({
          error: true,
          errormsg: 'Select a year to continue'
        })
      )
    })
  })

  describe('location validation', () => {
    it('renders error when selectedlocation is missing', () => {
      const request = makeRequest({ ...validSession, selectedlocation: null })
      const h = makeH()
      const result = downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        error: true,
        errormsg: 'Select a location to continue',
        errorref1: 'Add location',
        errorhref1: '/location-aurn?change=true',
        errorref2: '',
        errorhref2: '',
        selectedpollutant: ['NO2'],
        selectedyear: '2023',
        selectedlocation: null,
        stationcount: 5,
        stationcountukeap: null,
        datasourceGroups: [],
        displayBacklink: true,
        hrefq: '/customdataset'
      })
      expect(result).toBe('view-response')
    })
  })

  describe('stationCountUnavailable logic', () => {
    it('is true when stationCountError flag is set', () => {
      const request = makeRequest({
        ...validSession,
        stationCountError: true,
        nooflocation: 5
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          stationCountUnavailable: true,
          stationcount: null
        })
      )
    })

    it('is true when nooflocation is null', () => {
      const request = makeRequest({ ...validSession, nooflocation: null })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          stationCountUnavailable: true,
          stationcount: null
        })
      )
    })

    it('is true when nooflocation is an Error instance', () => {
      const request = makeRequest({
        ...validSession,
        nooflocation: new Error('API failed')
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          stationCountUnavailable: true,
          stationcount: null
        })
      )
    })

    it('is true when nooflocation is a plain object', () => {
      const request = makeRequest({
        ...validSession,
        nooflocation: { some: 'object' }
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          stationCountUnavailable: true,
          stationcount: null
        })
      )
    })

    it('is false when nooflocation is a number', () => {
      const request = makeRequest({ ...validSession, nooflocation: 5 })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          stationCountUnavailable: false,
          stationcount: 5
        })
      )
    })

    it('is false when nooflocation is 0 (arrays of NON-AURN counts are valid)', () => {
      const request = makeRequest({ ...validSession, nooflocation: 0 })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          stationCountUnavailable: false,
          stationcount: 0
        })
      )
    })

    it('is false when nooflocation is an array (NON-AURN format)', () => {
      const request = makeRequest({
        ...validSession,
        nooflocation: [{ networkType: 'UKEAP', count: 3 }]
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ stationCountUnavailable: false })
      )
    })
  })

  describe('ukeapNetworks and ukeapUnavailable logic', () => {
    it('ukeapUnavailable is true when datasourceGroups has no Other data category', () => {
      const request = makeRequest({
        ...validSession,
        datasourceGroups: [
          { category: 'Near real-time data from Defra', networks: ['AURN'] }
        ],
        nooflocationukeap: [{ networkType: 'UKEAP', count: 3 }]
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          ukeapUnavailable: true,
          ukeapNetworks: [{ networkType: 'UKEAP', count: 3 }]
        })
      )
    })

    it('ukeapUnavailable is true when Other data category has empty networks', () => {
      const request = makeRequest({
        ...validSession,
        datasourceGroups: [{ category: 'Other data from Defra', networks: [] }],
        nooflocationukeap: [{ networkType: 'UKEAP', count: 3 }]
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ ukeapUnavailable: true })
      )
    })

    it('ukeapUnavailable is true when hasOtherDataSource but ukeapNetworks is empty', () => {
      const request = makeRequest({
        ...validSession,
        datasourceGroups: [
          { category: 'Other data from Defra', networks: ['UKEAP'] }
        ],
        nooflocationukeap: null
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ ukeapUnavailable: true, ukeapNetworks: [] })
      )
    })

    it('ukeapUnavailable is false when hasOtherDataSource and ukeapNetworks is populated', () => {
      const request = makeRequest({
        ...validSession,
        datasourceGroups: [
          { category: 'Other data from Defra', networks: ['UKEAP'] }
        ],
        nooflocationukeap: [{ networkType: 'UKEAP', count: 4 }]
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({
          ukeapUnavailable: false,
          ukeapNetworks: [{ networkType: 'UKEAP', count: 4 }]
        })
      )
    })

    it('ukeapNetworks defaults to [] when nooflocationukeap is not an array', () => {
      const request = makeRequest({
        ...validSession,
        datasourceGroups: [
          { category: 'Other data from Defra', networks: ['UKEAP'] }
        ],
        nooflocationukeap: 'not-an-array'
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ ukeapNetworks: [] })
      )
    })
  })

  describe('success view rendering', () => {
    it('renders full success view with all fields', () => {
      const request = makeRequest({
        selectedpollutant: ['NO2'],
        selectedyear: '2021-2023',
        selectedlocation: ['London'],
        nooflocation: 5,
        stationCountError: false,
        datasourceGroups: [],
        nooflocationukeap: null,
        yearrange: 'Multiple',
        finalyear: '2021,2022,2023'
      })
      const h = makeH()
      const result = downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith('download_dataselector/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        downloadaurnresult: null,
        stationcount: 5,
        stationCountUnavailable: false,
        ukeapNetworks: [],
        ukeapUnavailable: true,
        yearrange: 'Multiple',
        displayBacklink: true,
        hrefq: '/customdataset',
        finalyear: ['2021', '2022', '2023']
      })
      expect(result).toBe('view-response')
    })

    it('clears downloadaurnresult in session before rendering', () => {
      const request = makeRequest(validSession)
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(request.yar.set).toHaveBeenCalledWith('downloadaurnresult', null)
    })

    it('stores downloadViewData in session on success', () => {
      const request = makeRequest(validSession)
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(request.yar.set).toHaveBeenCalledWith(
        'downloadViewData',
        expect.objectContaining({
          pageTitle: englishNew.custom.pageTitle,
          downloadaurnresult: null,
          stationcount: 5,
          stationCountUnavailable: false,
          displayBacklink: true,
          hrefq: '/customdataset'
        })
      )
    })

    it('handles undefined finalyear -> empty array', () => {
      const request = makeRequest({ ...validSession, finalyear: undefined })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ finalyear: [] })
      )
    })

    it('handles null finalyear -> empty array', () => {
      const request = makeRequest({ ...validSession, finalyear: null })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ finalyear: [] })
      )
    })

    it('parses finalyear with extra whitespace', () => {
      const request = makeRequest({
        ...validSession,
        finalyear: '2020,  2021  , 2022 , 2023',
        yearrange: 'Multiple'
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ finalyear: ['2020', '2021', '2022', '2023'] })
      )
    })

    it('handles single year finalyear', () => {
      const request = makeRequest({
        ...validSession,
        finalyear: '2023',
        yearrange: 'Single'
      })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ finalyear: ['2023'], yearrange: 'Single' })
      )
    })

    it('reads yearrange from session', () => {
      const request = makeRequest({ ...validSession, yearrange: 'Multiple' })
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(h.view).toHaveBeenCalledWith(
        'download_dataselector/index',
        expect.objectContaining({ yearrange: 'Multiple' })
      )
    })
  })

  describe('session reads', () => {
    it('reads all required session keys on success path', () => {
      const request = makeRequest(validSession)
      const h = makeH()
      downloadDataselectorController.handler(request, h)
      expect(request.yar.get).toHaveBeenCalledWith('selectedpollutant')
      expect(request.yar.get).toHaveBeenCalledWith('selectedyear')
      expect(request.yar.get).toHaveBeenCalledWith('selectedlocation')
      expect(request.yar.get).toHaveBeenCalledWith('nooflocation')
      expect(request.yar.get).toHaveBeenCalledWith('stationCountError')
      expect(request.yar.get).toHaveBeenCalledWith('datasourceGroups')
      expect(request.yar.get).toHaveBeenCalledWith('nooflocationukeap')
      expect(request.yar.get).toHaveBeenCalledWith('yearrange')
      expect(request.yar.get).toHaveBeenCalledWith('finalyear')
    })
  })
})
