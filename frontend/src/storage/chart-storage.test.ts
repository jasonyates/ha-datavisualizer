import { describe, it, expect, beforeEach } from 'vitest';
import { ChartStorage, type SavedChart } from './chart-storage';

describe('ChartStorage', () => {
  let storage: ChartStorage;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storage = new ChartStorage();
  });

  describe('save', () => {
    it('should save a new chart and return it with an id', () => {
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

      const saved = storage.save(chart);

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Test Chart');
      expect(saved.createdAt).toBeDefined();
    });

    it('should update an existing chart', async () => {
      const chart = storage.save({
        name: 'Original',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

      // Wait 10ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = storage.save({ ...chart, name: 'Updated' });

      expect(updated.id).toBe(chart.id);
      expect(updated.name).toBe('Updated');
      expect(updated.updatedAt).not.toBe(chart.updatedAt);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no charts saved', () => {
      expect(storage.getAll()).toEqual([]);
    });

    it('should return all saved charts', () => {
      storage.save({ name: 'Chart 1', entities: [], timeRange: { preset: '7d' }, axes: [] });
      storage.save({ name: 'Chart 2', entities: [], timeRange: { preset: '7d' }, axes: [] });

      const all = storage.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should return a chart by id', () => {
      const saved = storage.save({
        name: 'Test',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

      const retrieved = storage.get(saved.id);
      expect(retrieved?.name).toBe('Test');
    });

    it('should return undefined for non-existent id', () => {
      expect(storage.get('non-existent')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should remove a chart by id', () => {
      const saved = storage.save({
        name: 'To Delete',
        entities: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

      storage.delete(saved.id);

      expect(storage.get(saved.id)).toBeUndefined();
      expect(storage.getAll()).toHaveLength(0);
    });
  });

  describe('duplicate', () => {
    it('should create a copy with new id and updated name', () => {
      const original = storage.save({
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

      const copy = storage.duplicate(original.id);

      expect(copy).toBeDefined();
      expect(copy!.id).not.toBe(original.id);
      expect(copy!.name).toBe('Original (copy)');
      expect(copy!.entities).toEqual(original.entities);
    });
  });

  describe('exportAll', () => {
    it('should export all charts as JSON string', () => {
      storage.save({ name: 'Chart 1', entities: [], timeRange: { preset: '7d' }, axes: [] });
      storage.save({ name: 'Chart 2', entities: [], timeRange: { preset: '24h' }, axes: [] });

      const exported = storage.exportAll();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Chart 1');
      expect(parsed[1].name).toBe('Chart 2');
    });
  });

  describe('importCharts', () => {
    it('should import charts from JSON and return count', () => {
      const chartsJson = JSON.stringify([
        { name: 'Imported 1', entities: [], timeRange: { preset: '7d' }, axes: [] },
        { name: 'Imported 2', entities: [], timeRange: { preset: '24h' }, axes: [] },
      ]);

      const count = storage.importCharts(chartsJson);

      expect(count).toBe(2);
      expect(storage.getAll()).toHaveLength(2);
    });

    it('should return 0 for invalid JSON', () => {
      const count = storage.importCharts('invalid json');
      expect(count).toBe(0);
    });
  });
});
