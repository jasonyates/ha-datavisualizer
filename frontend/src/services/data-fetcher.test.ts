import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataFetcher } from './data-fetcher';
import type { HaApi } from './ha-api';

describe('DataFetcher', () => {
  let mockApi: HaApi;
  let fetcher: DataFetcher;

  beforeEach(() => {
    mockApi = {
      getStatistics: vi.fn(),
      getState: vi.fn(),
    } as unknown as HaApi;
    fetcher = new DataFetcher(mockApi);
  });

  describe('fetchData with statistics types', () => {
    it('should fetch mean statistics', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      vi.mocked(mockApi.getStatistics).mockResolvedValue([
        { start: start.toISOString(), mean: 100, statistic_id: 'sensor.power', end: now.toISOString() },
        { start: now.toISOString(), mean: 150, statistic_id: 'sensor.power', end: now.toISOString() },
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W', friendly_name: 'Power' },
      } as any);

      const result = await fetcher.fetchData('sensor.power', start, now, {
        statisticsType: 'mean',
        groupingPeriod: 'day',
      });

      expect(mockApi.getStatistics).toHaveBeenCalledWith('sensor.power', start, now, 'day');
      expect(result.dataPoints).toHaveLength(2);
      expect(result.dataPoints[0].value).toBe(100);
      expect(result.dataPoints[1].value).toBe(150);
    });

    it('should calculate change (delta) for energy sensors', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      vi.mocked(mockApi.getStatistics).mockResolvedValue([
        { start: start.toISOString(), state: 100, statistic_id: 'sensor.energy', end: now.toISOString() },
        { start: new Date(start.getTime() + 86400000).toISOString(), state: 150, statistic_id: 'sensor.energy', end: now.toISOString() },
        { start: now.toISOString(), state: 180, statistic_id: 'sensor.energy', end: now.toISOString() },
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'kWh', friendly_name: 'Energy' },
      } as any);

      const result = await fetcher.fetchData('sensor.energy', start, now, {
        statisticsType: 'change',
        groupingPeriod: 'day',
      });

      // Change calculates deltas: 150-100=50, 180-150=30
      expect(result.dataPoints).toHaveLength(2);
      expect(result.dataPoints[0].value).toBe(50);
      expect(result.dataPoints[1].value).toBe(30);
    });

    it('should use correct grouping period', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      vi.mocked(mockApi.getStatistics).mockResolvedValue([]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W' },
      } as any);

      await fetcher.fetchData('sensor.power', start, now, {
        statisticsType: 'mean',
        groupingPeriod: 'hour',
      });

      expect(mockApi.getStatistics).toHaveBeenCalledWith('sensor.power', start, now, 'hour');
    });
  });

  describe('fetchMultiple', () => {
    it('should fetch multiple entities with individual options', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      vi.mocked(mockApi.getStatistics).mockResolvedValue([
        { start: start.toISOString(), mean: 100, statistic_id: 'sensor.power', end: now.toISOString() },
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W', friendly_name: 'Test' },
      } as any);

      const result = await fetcher.fetchMultiple(
        [
          { entityId: 'sensor.power', options: { statisticsType: 'mean', groupingPeriod: 'day' } },
          { entityId: 'sensor.energy', options: { statisticsType: 'change', groupingPeriod: 'day' } },
        ],
        start,
        now
      );

      expect(result).toHaveLength(2);
      expect(mockApi.getStatistics).toHaveBeenCalledTimes(2);
    });
  });
});
