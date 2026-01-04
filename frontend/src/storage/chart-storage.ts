import type { HomeAssistant } from '../types/homeassistant';
import type { StatisticsType, GroupingPeriod } from '../utils/statistics';

export interface EntityConfig {
  entityId: string;
  axisId: 'left' | 'right';
  chartType: 'bar' | 'line' | 'area';
  statisticsType: StatisticsType;
  groupingPeriod: GroupingPeriod;
  color?: string;
}

export interface AxisConfig {
  id: string;
  position: 'left' | 'right';
  name?: string;
  unit?: string;
  entityIds: string[];
}

export interface TimeRangeConfig {
  preset?: string;
  start?: string;
  end?: string;
}

export interface SavedChart {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  naturalQuery?: string;
  entities: EntityConfig[];
  timeRange: TimeRangeConfig;
  axes: AxisConfig[];
  colors?: Record<string, string>;
  title?: string;
}

const STORAGE_KEY = 'data_visualizer_charts';

export class ChartStorage {
  private charts: SavedChart[] = [];
  private hass: HomeAssistant;
  private loaded = false;

  constructor(hass: HomeAssistant) {
    this.hass = hass;
  }

  async load(forceReload = false): Promise<void> {
    if (this.loaded && !forceReload) return;
    try {
      const result = await this.hass.callWS<{ value: SavedChart[] | null }>({
        type: 'frontend/get_user_data',
        key: STORAGE_KEY,
      });
      this.charts = result.value || [];
      this.loaded = true;
    } catch (e) {
      console.warn('Failed to load charts from HA storage:', e);
      this.charts = [];
      this.loaded = true;
    }
  }

  /**
   * Force reload charts from storage.
   */
  async reload(): Promise<void> {
    await this.load(true);
  }

  private async persist(): Promise<void> {
    try {
      await this.hass.callWS({
        type: 'frontend/set_user_data',
        key: STORAGE_KEY,
        value: this.charts,
      });
    } catch (e) {
      console.warn('Failed to persist charts to HA storage:', e);
    }
  }

  /**
   * Save a new chart or update an existing one.
   */
  async save(chart: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }): Promise<SavedChart> {
    await this.load();
    const now = new Date().toISOString();

    if (chart.id) {
      // Update existing
      const index = this.charts.findIndex((c) => c.id === chart.id);
      if (index !== -1) {
        const updated: SavedChart = {
          ...this.charts[index],
          ...chart,
          id: chart.id,
          updatedAt: now,
        };
        this.charts[index] = updated;
        await this.persist();
        return updated;
      }
    }

    // Create new
    const newChart: SavedChart = {
      ...chart,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.charts.push(newChart);
    await this.persist();
    return newChart;
  }

  /**
   * Get all saved charts.
   */
  async getAll(): Promise<SavedChart[]> {
    await this.load();
    return [...this.charts].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get a chart by ID.
   */
  async get(id: string): Promise<SavedChart | undefined> {
    await this.load();
    const chart = this.charts.find((c) => c.id === id);
    return chart ? { ...chart } : undefined;
  }

  /**
   * Delete a chart by ID.
   */
  async delete(id: string): Promise<boolean> {
    await this.load();
    const index = this.charts.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.charts.splice(index, 1);
      await this.persist();
      return true;
    }
    return false;
  }

  /**
   * Duplicate a chart.
   */
  async duplicate(id: string): Promise<SavedChart | undefined> {
    const original = await this.get(id);
    if (!original) return undefined;

    const { id: _, createdAt: __, updatedAt: ___, ...rest } = original;
    return this.save({
      ...rest,
      name: `${original.name} (copy)`,
    });
  }

  /**
   * Export all charts as JSON string.
   */
  async exportAll(): Promise<string> {
    await this.load();
    return JSON.stringify(this.charts, null, 2);
  }

  /**
   * Import charts from JSON string.
   */
  async importCharts(json: string): Promise<number> {
    try {
      const imported = JSON.parse(json) as SavedChart[];
      let count = 0;
      for (const chart of imported) {
        // Generate new IDs to avoid conflicts
        const { id: _, ...rest } = chart;
        await this.save(rest);
        count++;
      }
      return count;
    } catch {
      return 0;
    }
  }

  private generateId(): string {
    return `chart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
