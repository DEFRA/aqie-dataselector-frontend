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
      expect(h.view).toHaveBeenCalledWith('download_dataselector_nojs/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        downloadaurnresult: 'https://example.com/file.csv',
        stationcount: 4,
        yearrange: 'Single',
        hrefq: '/customdataset',
        finalyear: ['2019', '2020']
      })
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
  })

  describe('POST validation', () => {
    beforeEach(() => {
      request.method = 'post'
    })

    it('returns error view when selectedyear is missing', () => {
      // selectedlocation present, selectedyear missing
      request.yar.set('selectedpollutant', ['NO2'])
      request.yar.set('selectedlocation', ['Somewhere'])

      const res = downloadDataselectornojsController.handler(request, h)

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
        selectedyear: undefined,
        selectedlocation: ['Somewhere'],
        stationcount: undefined,
        hrefq: '/customdataset'
      })
      expect(res).toBe('view-response')
    })

    it('returns error view when selectedlocation is missing', () => {
      // selectedyear present, selectedlocation missing
      request.yar.set('selectedpollutant', ['PM10'])
      request.yar.set('selectedyear', '2024')

      const res = downloadDataselectornojsController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('customdataset/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        error: true,
        errormsg: 'Select a location to continue',
        errorref1: 'Add location',
        errorhref1: '/location-aurn/nojs',
        errorref2: '',
        errorhref2: '',
        selectedpollutant: ['PM10'],
        selectedyear: '2024',
        selectedlocation: undefined,
        stationcount: undefined,
        hrefq: '/customdataset'
      })
      expect(res).toBe('view-response')
    })

    it('returns error when no stations found (0, "0", or falsy)', () => {
      request.yar.set('selectedpollutant', ['SO2'])
      request.yar.set('selectedyear', '2024')
      request.yar.set('selectedlocation', ['A'])

      // Case 1: numeric 0
      request.yar.set('nooflocation', 0)
      downloadDataselectornojsController.handler(request, h)
      expect(h.view).toHaveBeenLastCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg:
            'There are no stations available based on your selection. Change the year or location',
          errorref1: 'Change the year',
          errorhref1: '/year-aurn',
          errorref2: 'Change the location',
          errorhref2: '/location-aurn/nojs'
        })
      )

      // Case 2: string "0"
      request.yar.set('nooflocation', '0')
      downloadDataselectornojsController.handler(request, h)
      expect(h.view).toHaveBeenLastCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg:
            'There are no stations available based on your selection. Change the year or location'
        })
      )

      // Case 3: undefined/falsy
      request.yar.set('nooflocation', undefined)
      const res = downloadDataselectornojsController.handler(request, h)
      expect(h.view).toHaveBeenLastCalledWith(
        'customdataset/index',
        expect.objectContaining({
          error: true,
          errormsg:
            'There are no stations available based on your selection. Change the year or location'
        })
      )
      expect(res).toBe('view-response')
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

      expect(h.view).toHaveBeenCalledWith('download_dataselector_nojs/index', {
        pageTitle: englishNew.custom.pageTitle,
        heading: englishNew.custom.heading,
        texts: englishNew.custom.texts,
        downloadaurnresult: 'https://example.com/file.csv',
        stationcount: 4,
        yearrange: 'Multiple',
        hrefq: '/customdataset',
        finalyear: ['2020', '2022']
      })
      expect(res).toBe('view-response')
    })
  })
})
