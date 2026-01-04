import { describe, it, expect, beforeEach } from 'vitest';
import { ChartStorage, type SavedChart } from './chart-storage';
import type { HomeAssistant } from '../types/homeassistant';

describe('ChartStorage', () => {
  let storage: ChartStorage;
  let mockHass: HomeAssistant;
  let mockStorage: Map<string, any>;

  beforeEach(() => {
    // Create a mock storage for testing
    mockStorage = new Map();

    // Create mock HomeAssistant object
    mockHass = {
      callWS: async (msg: any) => {
        if (msg.type === 'frontend/get_user_data') {
          return { value: mockStorage.get(msg.key) || null };
        } else if (msg.type === 'frontend/set_user_data') {
          mockStorage.set(msg.key, msg.value);
          return {};
        }
        return {};
      },
    } as any;

    storage = new ChartStorage(mockHass);
  });

  describe('save', () => {
    it('should save a new chart and return it with an id', async () => {
      const chart: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Chart',
        entities: [{
          entityId: 'sensor.power',
          axisId: 'left',
          chartType: 'bar',
          statisticsType: 'change',
          groupingPeriod: 'day',
        }],
        timeRange: { preset: '7d' },
        axes: [{ id: 'left', position: 'left', entityIds: ['sensor.power'] }],
      };

      const saved = await storage.save(chart);

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Test Chart');
      expect(saved.createdAt).toBeDefined();
    });

    it('should update an existing chart', async () => {
      const chart = await storage.save({
        name: 'Original',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

      // Wait 10ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await storage.save({ ...chart, name: 'Updated' });

      expect(updated.id).toBe(chart.id);
      expect(updated.name).toBe('Updated');
      expect(updated.updatedAt).not.toBe(chart.updatedAt);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no charts saved', async () => {
      const all = await storage.getAll();
      expect(all).toEqual([]);
    });

    it('should return all saved charts', async () => {
      await storage.save({ name: 'Chart 1', entities: [], timeRange: { preset: '7d' }, axes: [] });
      await storage.save({ name: 'Chart 2', entities: [], timeRange: { preset: '7d' }, axes: [] });

      const all = await storage.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should return a chart by id', async () => {
      const saved = await storage.save({
        name: 'Test',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

      const retrieved = await storage.get(saved.id);
      expect(retrieved?.name).toBe('Test');
    });

    it('should return undefined for non-existent id', async () => {
      const result = await storage.get('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should remove a chart by id', async () => {
      const saved = await storage.save({
        name: 'To Delete',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

      await storage.delete(saved.id);

      const retrieved = await storage.get(saved.id);
      expect(retrieved).toBeUndefined();

      const all = await storage.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('duplicate', () => {
    it('should create a copy with new id and updated name', async () => {
      const original = await storage.save({
        name: 'Original',
        entities: [{
          entityId: 'sensor.power',
          axisId: 'left',
          chartType: 'line',
          statisticsType: 'mean',
          groupingPeriod: 'hour',
        }],
        timeRange: { preset: '7d' },
        axes: [],
      });

      const copy = await storage.duplicate(original.id);

      expect(copy).toBeDefined();
      expect(copy!.id).not.toBe(original.id);
      expect(copy!.name).toBe('Original (copy)');
      expect(copy!.entities).toEqual(original.entities);
    });
  });

  describe('exportAll', () => {
    it('should export all charts as JSON string', async () => {
      await storage.save({ name: 'Chart 1', entities: [], timeRange: { preset: '7d' }, axes: [] });
      await storage.save({ name: 'Chart 2', entities: [], timeRange: { preset: '24h' }, axes: [] });

      const exported = await storage.exportAll();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Chart 1');
      expect(parsed[1].name).toBe('Chart 2');
    });
  });

  describe('importCharts', () => {
    it('should import charts from JSON and return count', async () => {
      const chartsJson = JSON.stringify([
        { name: 'Imported 1', entities: [], timeRange: { preset: '7d' }, axes: [] },
        { name: 'Imported 2', entities: [], timeRange: { preset: '24h' }, axes: [] },
      ]);

      const count = await storage.importCharts(chartsJson);

      expect(count).toBe(2);

      const all = await storage.getAll();
      expect(all).toHaveLength(2);
    });

    it('should return 0 for invalid JSON', async () => {
      const count = await storage.importCharts('invalid json');
      expect(count).toBe(0);
    });
  });

  describe('legendConfig', () => {
    it('should save and retrieve legendConfig', async () => {
      const chart = await storage.save({
        name: 'Chart with legend config',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
        legendConfig: {
          mode: 'table',
          showMin: true,
          showAvg: true,
          showMax: false,
          showCurrent: true,
        },
      });

      const retrieved = await storage.get(chart.id);
      expect(retrieved?.legendConfig).toEqual({
        mode: 'table',
        showMin: true,
        showAvg: true,
        showMax: false,
        showCurrent: true,
      });
    });

    it('should default to undefined legendConfig for backward compatibility', async () => {
      const chart = await storage.save({
        name: 'Chart without legend config',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

      const retrieved = await storage.get(chart.id);
      expect(retrieved?.legendConfig).toBeUndefined();
    });
  });
});
