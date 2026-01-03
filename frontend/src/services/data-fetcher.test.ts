import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataFetcher, type ChartDataPoint } from './data-fetcher';
import { HaApi } from './ha-api';

vi.mock('./ha-api');

describe('DataFetcher', () => {
  let mockApi: HaApi;
  let fetcher: DataFetcher;

  beforeEach(() => {
    mockApi = {
      getHistory: vi.fn(),
      getStatistics: vi.fn(),
      getState: vi.fn(),
    } as unknown as HaApi;
    fetcher = new DataFetcher(mockApi);
  });

  describe('fetchData', () => {
    it('should use history API for ranges under 24 hours', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      vi.mocked(mockApi.getHistory).mockResolvedValue([
        { entity_id: 'sensor.power', state: '100', last_changed: start.toISOString() } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W' },
      } as any);

      await fetcher.fetchData('sensor.power', start, now);

      expect(mockApi.getHistory).toHaveBeenCalled();
      expect(mockApi.getStatistics).not.toHaveBeenCalled();
    });

    it('should use statistics API with 5minute period for 1-7 day ranges', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      vi.mocked(mockApi.getStatistics).mockResolvedValue([
        { statistic_id: 'sensor.power', start: start.toISOString(), mean: 100 } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W' },
      } as any);

      await fetcher.fetchData('sensor.power', start, now);

      expect(mockApi.getStatistics).toHaveBeenCalledWith(
        'sensor.power',
        start,
        now,
        '5minute'
      );
    });

    it('should use statistics API with hour period for ranges over 7 days', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

      vi.mocked(mockApi.getStatistics).mockResolvedValue([
        { statistic_id: 'sensor.power', start: start.toISOString(), mean: 100 } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W' },
      } as any);

      await fetcher.fetchData('sensor.power', start, now);

      expect(mockApi.getStatistics).toHaveBeenCalledWith(
        'sensor.power',
        start,
        now,
        'hour'
      );
    });

    it('should return normalized data points', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      vi.mocked(mockApi.getHistory).mockResolvedValue([
        { entity_id: 'sensor.power', state: '100', last_changed: start.toISOString() } as any,
        { entity_id: 'sensor.power', state: '150', last_changed: now.toISOString() } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W', friendly_name: 'Power' },
      } as any);

      const result = await fetcher.fetchData('sensor.power', start, now);

      expect(result.entityId).toBe('sensor.power');
      expect(result.unit).toBe('W');
      expect(result.name).toBe('Power');
      expect(result.dataPoints).toHaveLength(2);
      expect(result.dataPoints[0]).toEqual({
        timestamp: start.getTime(),
        value: 100,
      });
    });
  });
});
