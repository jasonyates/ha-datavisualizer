import { describe, it, expect, beforeEach } from 'vitest';
import { QueryParser } from './parser';
import type { HassEntityRegistry } from '../types/homeassistant';

describe('QueryParser', () => {
  const mockEntities: HassEntityRegistry[] = [
    { entity_id: 'sensor.power_usage', name: 'Power Usage' } as HassEntityRegistry,
    { entity_id: 'sensor.energy_cost', name: 'Energy Cost' } as HassEntityRegistry,
    { entity_id: 'sensor.temperature', name: 'Temperature' } as HassEntityRegistry,
    { entity_id: 'sensor.humidity', name: 'Humidity' } as HassEntityRegistry,
    { entity_id: 'sensor.grid_power', name: 'Grid Power' } as HassEntityRegistry,
    { entity_id: 'sensor.solar_power', name: 'Solar Power' } as HassEntityRegistry,
  ];

  let parser: QueryParser;

  beforeEach(() => {
    parser = new QueryParser(mockEntities);
  });

  describe('parseTimeRange', () => {
    it('should parse "last 7 days"', () => {
      const result = parser.parse('show me power usage last 7 days');
      expect(result.timeRange.preset).toBe('7d');
    });

    it('should parse "last week"', () => {
      const result = parser.parse('temperature last week');
      expect(result.timeRange.preset).toBe('7d');
    });

    it('should parse "past 30 days"', () => {
      const result = parser.parse('energy cost past 30 days');
      expect(result.timeRange.preset).toBe('30d');
    });

    it('should parse "yesterday"', () => {
      const result = parser.parse('power usage yesterday');
      expect(result.timeRange.preset).toBe('1d');
    });

    it('should parse "this month"', () => {
      const result = parser.parse('cost this month');
      expect(result.timeRange.preset).toBe('30d');
    });
  });

  describe('parseEntities', () => {
    it('should match entity by friendly name', () => {
      const result = parser.parse('show me power usage');
      expect(result.entities).toContain('sensor.power_usage');
    });

    it('should match multiple entities', () => {
      const result = parser.parse('temperature and humidity');
      expect(result.entities).toContain('sensor.temperature');
      expect(result.entities).toContain('sensor.humidity');
    });

    it('should handle "vs" comparison syntax', () => {
      const result = parser.parse('power usage vs cost');
      expect(result.entities.length).toBeGreaterThanOrEqual(2);
      expect(result.comparison).toBe(true);
    });
  });

  describe('parseChartType', () => {
    it('should detect "bar chart"', () => {
      const result = parser.parse('power usage as bar chart');
      expect(result.chartType).toBe('bar');
    });

    it('should detect "stacked"', () => {
      const result = parser.parse('stack grid and solar power');
      expect(result.stacked).toBe(true);
    });

    it('should detect "pie"', () => {
      const result = parser.parse('show pie chart of power usage');
      expect(result.chartType).toBe('pie');
    });
  });

  describe('parseAggregation', () => {
    it('should detect "daily"', () => {
      const result = parser.parse('daily power usage');
      expect(result.aggregation).toBe('day');
    });

    it('should detect "hourly"', () => {
      const result = parser.parse('hourly temperature');
      expect(result.aggregation).toBe('hour');
    });
  });

  describe('full queries', () => {
    it('should parse "electricity cost last month"', () => {
      const result = parser.parse('electricity cost last month');
      expect(result.entities).toContain('sensor.energy_cost');
      expect(result.timeRange.preset).toBe('30d');
    });

    it('should parse "temperature vs humidity this week"', () => {
      const result = parser.parse('temperature vs humidity this week');
      expect(result.entities).toContain('sensor.temperature');
      expect(result.entities).toContain('sensor.humidity');
      expect(result.comparison).toBe(true);
      expect(result.timeRange.preset).toBe('7d');
    });

    it('should parse "daily power usage as bar chart"', () => {
      const result = parser.parse('daily power usage as bar chart');
      expect(result.entities).toContain('sensor.power_usage');
      expect(result.chartType).toBe('bar');
      expect(result.aggregation).toBe('day');
    });
  });
});
