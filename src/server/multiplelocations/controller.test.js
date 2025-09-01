import { multipleLocationsController } from '~/src/server/multiplelocations/controller.js';
import axios from 'axios';
import { config } from '~/src/config/config.js';
import { setErrorMessage } from '~/src/server/common/helpers/errors_message.js';

jest.mock('axios');
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}));
jest.mock('~/src/server/common/helpers/errors_message.js', () => ({
  setErrorMessage: jest.fn()
}));

const mockYar = (overrides = {}) => {
  const store = {
    osnameapiresult: [],
    errors: 'Some error',
    errorMessage: 'Some error message',
    ...overrides
  };
  return {
    get: jest.fn((key) => store[key]),
    set: jest.fn((key, value) => {
      store[key] = value;
    })
  };
};

const mockRequest = (payload = {}, yarOverrides = {}) => ({
  payload,
  yar: mockYar(yarOverrides)
});

const mockH = {
  view: jest.fn()
};

describe('multipleLocationsController.handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key) => {
      if (key === 'OS_NAMES_API_URL') return 'https://mock-os-api.com';
      if (key === 'OS_NAMES_API_URL_1') return 'https://mock-monitoring-api.com';
    });
  });

  it('should return multiple locations view', async () => {
    const request = mockRequest({
      fullSearchQuery: 'London',
      locationMiles: '5'
    });

    axios.post
      .mockResolvedValueOnce({
        data: { getOSPlaces: [{ name: 'Loc1' }, { name: 'Loc2' }] }
      })
      .mockResolvedValueOnce({
        data: {
          getmonitoringstation: [
            {
              name: 'Station1',
              pollutants: { PM25: {}, MP10: {} }
            }
          ]
        }
      });

    await multipleLocationsController.handler(request, mockH);

    expect(mockH.view).toHaveBeenCalledWith(
      'multiplelocations/index',
      expect.objectContaining({
        results: [{ name: 'Loc1' }, { name: 'Loc2' }],
        monitoring_station: expect.any(Array)
      })
    );
  });

  it('should return monitoring station view for single location with stations', async () => {
    const request = mockRequest({
      fullSearchQuery: 'London',
      locationMiles: '5'
    });

    axios.post
      .mockResolvedValueOnce({ data: { getOSPlaces: [{ name: 'Loc1' }] } })
      .mockResolvedValueOnce({
        data: {
          getmonitoringstation: [
            {
              name: 'Station1',
              pollutants: { PM25: {}, MP10: {} }
            }
          ]
        }
      });

    await multipleLocationsController.handler(request, mockH);

    expect(mockH.view).toHaveBeenCalledWith(
      'monitoring-station/index',
      expect.objectContaining({
        monitoring_station: expect.any(Array)
      })
    );
  });

  it('should return no station view for single location without stations', async () => {
    const request = mockRequest({
      fullSearchQuery: 'London',
      locationMiles: '5'
    });

    axios.post
      .mockResolvedValueOnce({ data: { getOSPlaces: [{ name: 'Loc1' }] } })
      .mockResolvedValueOnce({ data: { getmonitoringstation: [] } });

    await multipleLocationsController.handler(request, mockH);

    expect(mockH.view).toHaveBeenCalledWith(
      'multiplelocations/nostation',
      expect.objectContaining({
        locationMiles: '5'
      })
    );
  });

  it('should return no location view when no locations found', async () => {
    const request = mockRequest({
      fullSearchQuery: 'Unknown',
      locationMiles: '5'
    });

    axios.post
      .mockResolvedValueOnce({ data: { getOSPlaces: [] } })
      .mockResolvedValueOnce({ data: { getmonitoringstation: [] } });

    await multipleLocationsController.handler(request, mockH);

    expect(mockH.view).toHaveBeenCalledWith(
      'multiplelocations/nolocation',
      expect.objectContaining({
        results: []
      })
    );
  });

  it('should return error view for special characters', async () => {
    const request = mockRequest({
      fullSearchQuery: 'Lond@n'
    });

    request.yar.get = jest.fn((key) => {
      if (key === 'hasSpecialCharacter') return true;
      if (key === 'fullSearchQuery') return { value: 'Lond@n' };
      if (key === 'errors') return 'Some error';
      if (key === 'errorMessage') return 'Some error message';
      return undefined;
    });

    await multipleLocationsController.handler(request, mockH);

    expect(setErrorMessage).toHaveBeenCalled();
    expect(mockH.view).toHaveBeenCalledWith(
      'search-location/index',
      expect.objectContaining({
        errors: 'Some error',
        errorMessage: 'Some error message'
      })
    );
  });

  it('should return error view for empty input', async () => {
    const request = mockRequest({
      fullSearchQuery: ''
    });

    request.yar.get = jest.fn((key) => {
      if (key === 'fullSearchQuery') return { value: '' };
      if (key === 'errors') return 'Some error';
      if (key === 'errorMessage') return 'Some error message';
      return undefined;
    });

    await multipleLocationsController.handler(request, mockH);

    expect(setErrorMessage).toHaveBeenCalled();
    expect(mockH.view).toHaveBeenCalledWith(
      'search-location/index',
      expect.objectContaining({
        errors: 'Some error',
        errorMessage: 'Some error message'
      })
    );
  });
});
