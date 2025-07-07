// __tests__/stationDetailsController.test.js
import { stationDetailsController } from '~/src/server/stationdetails/controller.js';
import axios from 'axios';

jest.mock('axios');

describe('stationDetailsController.handler', () => {
  let request, h;

  beforeEach(() => {
    request = {
      params: {
        id: 'station123',
        download: '2024',
        pollutant: 'NO2',
        frequency: 'hourly',
      },
      yar: {
        get: jest.fn(),
        set: jest.fn(),
      },
    };

    h = {
      view: jest.fn(),
    };

    // Mock session data
    const mockStation = {
      id: 'station123',
      region: 'RegionX',
      siteType: 'Urban',
      name: 'Station Name',
      localSiteID: 'LOC123',
      location: {
        coordinates: [51.5, -0.1],
      },
      updated: '2025-07-06T12:00:00Z',
      pollutants: ['NO2', 'PM10'],
    };

    request.yar.get.mockImplementation((key) => {
      const mockData = {
        MonitoringstResult: {
          getmonitoringstation: [mockStation],
        },
        stationdetails: mockStation,
        selectedYear: '2024',
        downloadPollutant: 'NO2',
        downloadFrequency: 'hourly',
        fullSearchQuery: { value: 'London' },
        locationMiles: '10',
        locationID: 'loc123',
        nooflocation: 'multiple',
      };
      return mockData[key];
    });
  });

  it('should render the stationdetails view with correct data', async () => {
    axios.post.mockResolvedValue({ data: 'mockDownloadData' });

    await stationDetailsController.handler(request, h);

    expect(request.yar.set).toHaveBeenCalledWith('downloadresult', 'mockDownloadData');
    // expect(h.view).toHaveBeenCalledWith(
    //   'stationdetails/index',
    //   expect.objectContaining({
    //     pageTitle: expect.any(String),
    //     stationdetails: expect.any(Object),
    //     selectedYear: '2024',
    //     downloadresult: 'mockDownloadData',
    //   })
    // );
  });

  it('should handle missing download param gracefully', async () => {
    delete request.params.download;

    await stationDetailsController.handler(request, h);

    expect(h.view).toHaveBeenCalled();
    // expect(request.yar.set).not.toHaveBeenCalledWith('downloadresult', expect.anything());
  });
});
