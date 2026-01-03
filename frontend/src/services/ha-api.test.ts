import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HaApi } from './ha-api';
import type { HomeAssistant } from '../types/homeassistant';

describe('HaApi', () => {
  let mockHass: HomeAssistant;
  let api: HaApi;

  beforeEach(() => {
    mockHass = {
      callWS: vi.fn(),
      states: {},
    } as unknown as HomeAssistant;
    api = new HaApi(mockHass);
  });

  describe('getEntityRegistry', () => {
    it('should fetch entity registry via websocket', async () => {
      const mockRegistry = [
        { entity_id: 'sensor.power', name: 'Power' },
        { entity_id: 'sensor.temp', name: 'Temperature' },
      ];
      vi.mocked(mockHass.callWS).mockResolvedValue(mockRegistry);

      const result = await api.getEntityRegistry();

      expect(mockHass.callWS).toHaveBeenCalledWith({ type: 'config/entity_registry/list' });
      expect(result).toEqual(mockRegistry);
    });
  });

  describe('getHistory', () => {
    it('should fetch history for entity within time range', async () => {
      const mockHistory = [[
        { entity_id: 'sensor.power', state: '100', last_changed: '2024-01-01T00:00:00Z' },
      ]];
      vi.mocked(mockHass.callWS).mockResolvedValue(mockHistory);

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');
      const result = await api.getHistory('sensor.power', start, end);

      expect(mockHass.callWS).toHaveBeenCalledWith({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: ['sensor.power'],
        minimal_response: true,
        significant_changes_only: false,
      });
      expect(result).toEqual(mockHistory[0]);
    });
  });

  describe('getStatistics', () => {
    it('should fetch statistics for entity within time range', async () => {
      const mockStats = {
        'sensor.power': [
          { start: '2024-01-01T00:00:00Z', mean: 100 },
        ],
      };
      vi.mocked(mockHass.callWS).mockResolvedValue(mockStats);

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');
      const result = await api.getStatistics('sensor.power', start, end, 'hour');

      expect(mockHass.callWS).toHaveBeenCalledWith({
        type: 'recorder/statistics_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: ['sensor.power'],
        period: 'hour',
      });
      expect(result).toEqual(mockStats['sensor.power']);
    });
  });
});
