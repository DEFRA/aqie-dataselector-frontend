// controller.test.js

import { customdatasetController } from '~/src/server/customdataset/controller.js'

import {
  isInternalNavigation,
  renderNotFound
} from '~/src/server/common/helpers/navigation-helpers.js'

import {
  handlePollutantsFromParams,
  handleTimePeriodSelection,
  handleLocationSelection
} from '~/src/server/customdataset/selection-helpers.js'

import {
  shouldShowOtherOnlyTimePeriodError,
  shouldShowZoneNonAurnError,
  setDownloadDatasourceOverrideForLast7Days,
  setDownloadDatasourceOverrideForZones,
  isLast7DaysSelection,
  shouldShowZoneWarning
} from '~/src/server/customdataset/datasource-category.js'

import { handleStationCountCalculation } from '~/src/server/customdataset/station-count-workflow.js'

import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js'

jest.mock('~/src/server/common/helpers/navigation-helpers.js', () => ({
  isInternalNavigation: jest.fn(),
  renderNotFound: jest.fn()
}))

jest.mock('~/src/server/customdataset/selection-helpers.js', () => ({
  handlePollutantsFromParams: jest.fn(),
  handleTimePeriodSelection: jest.fn(),
  handleLocationSelection: jest.fn()
}))

jest.mock('~/src/server/customdataset/station-count-workflow.js', () => ({
  handleStationCountCalculation: jest.fn()
}))

jest.mock('~/src/server/common/helpers/errors_message.js', () => ({
  setErrorMessage: jest.fn()
}))

jest.mock('~/src/server/customdataset/datasource-category.js', () => ({
  inferDatasourceCategoryTypeFromGroups: jest.fn(() => 'both'),
  getDatasourceCategoryType: jest.fn(() => 'both'),
  isLast7DaysSelection: jest.fn(() => false),
  shouldShowOtherOnlyTimePeriodError: jest.fn(() => false),
  setDownloadDatasourceOverrideForLast7Days: jest.fn(),
  shouldShowZoneWarning: jest.fn(() => false),
  shouldShowZoneNonAurnError: jest.fn(() => false),
  setDownloadDatasourceOverrideForZones: jest.fn(),
  getZoneAgglomerationWarningText: jest.fn(() => 'Zone warning')
}))

const createRequest = (overrides = {}) => ({
  path: '/customdataset',
  params: {},
  query: {},
  headers: {
    accept: 'text/javascript',
    'user-agent': 'chrome'
  },
  yar: {
    get: jest.fn((key) => {
      const values = {
        selectedpollutant: 'NO2',
        selectedyear: '2024',
        selectedlocation: 'London',
        nooflocation: 5,
        datasourceGroups: []
      }

      return values[key]
    }),
    set: jest.fn()
  },
  ...overrides
})

const createH = () => ({
  view: jest.fn().mockReturnValue('viewResponse')
})

describe('customdatasetController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('navigation validation', () => {
    it('should render not found when navigation is invalid', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(false)
      renderNotFound.mockReturnValue('notFound')

      const result = await customdatasetController.handler(request, h)

      expect(renderNotFound).toHaveBeenCalledWith(h)
      expect(result).toBe('notFound')
    })
  })

  describe('clear route', () => {
    it('should clear session and render page', async () => {
      const request = createRequest({
        path: '/customdataset/clear'
      })

      const h = createH()

      isInternalNavigation.mockReturnValue(false)

      await customdatasetController.handler(request, h)

      expect(request.yar.set).toHaveBeenCalled()
      expect(h.view).toHaveBeenCalled()
    })
  })

  describe('null pollutants', () => {
    it('should render pollutant error page', async () => {
      const request = createRequest({
        params: {
          pollutants: 'null'
        }
      })

      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(setErrorMessage).toHaveBeenCalled()
      expect(h.view).toHaveBeenCalled()
    })
  })

  describe('selection handlers', () => {
    it('should invoke selection helper methods', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(handlePollutantsFromParams).toHaveBeenCalledWith(request)
      expect(handleTimePeriodSelection).toHaveBeenCalledWith(request)
      expect(handleLocationSelection).toHaveBeenCalledWith(request)
    })
  })

  describe('download overrides', () => {
    it('should call datasource override methods', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(setDownloadDatasourceOverrideForLast7Days).toHaveBeenCalledWith(
        request
      )

      expect(setDownloadDatasourceOverrideForZones).toHaveBeenCalledWith(
        request
      )
    })
  })

  describe('other only error flow', () => {
    it('should stop processing and render page', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      shouldShowOtherOnlyTimePeriodError.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(handleStationCountCalculation).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalled()
    })
  })

  describe('zone non aurn', () => {
    it('should render zone non aurn error', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)
      shouldShowOtherOnlyTimePeriodError.mockReturnValue(false)
      shouldShowZoneNonAurnError.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(handleStationCountCalculation).not.toHaveBeenCalled()

      expect(request.yar.set.mock.calls).toContainEqual([
        'nooflocationukeap',
        []
      ])

      expect(h.view).toHaveBeenCalled()
    })
  })

  describe('station count', () => {
    it('should call station count calculation when all required data exists', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)
      shouldShowOtherOnlyTimePeriodError.mockReturnValue(false)
      shouldShowZoneNonAurnError.mockReturnValue(false)

      handleStationCountCalculation.mockResolvedValue({
        bothZero: false
      })

      await customdatasetController.handler(request, h)

      expect(handleStationCountCalculation).toHaveBeenCalledTimes(1)
      expect(handleStationCountCalculation).toHaveBeenCalledWith(request)
    })

    it('should render both zero view when bothZero=true', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      handleStationCountCalculation.mockResolvedValue({
        bothZero: true
      })

      await customdatasetController.handler(request, h)

      expect(h.view).toHaveBeenCalled()

      const secondArg = h.view.mock.calls[0][1]

      expect(secondArg.error).toBe(true)
    })

    it('should render normal dataset view when station count succeeds', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      handleStationCountCalculation.mockResolvedValue({
        bothZero: false
      })

      await customdatasetController.handler(request, h)

      expect(h.view).toHaveBeenCalled()
    })
  })

  describe('missing required fields', () => {
    it('should skip station calculation when required data missing', async () => {
      const request = createRequest()

      request.yar.get = jest.fn((key) => {
        const values = {
          selectedpollutant: '',
          selectedyear: '',
          selectedlocation: '',
          datasourceGroups: []
        }

        return values[key]
      })

      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(handleStationCountCalculation).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalled()
    })
  })

  describe('warning scenarios', () => {
    it('should support last 7 days warning path', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      isLast7DaysSelection.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(h.view).toHaveBeenCalled()
    })

    it('should support zone warning path', async () => {
      const request = createRequest()
      const h = createH()

      isInternalNavigation.mockReturnValue(true)

      shouldShowZoneWarning.mockReturnValue(true)

      await customdatasetController.handler(request, h)

      expect(h.view).toHaveBeenCalled()
    })
  })
})
