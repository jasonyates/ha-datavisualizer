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

const STORAGE_KEY = 'ha-data-visualizer-charts';

export class ChartStorage {
  private charts: SavedChart[] = [];

  constructor() {
    this.load();
  }

  /**
   * Save a new chart or update an existing one.
   */
  save(chart: Omit<SavedChart, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }): SavedChart {
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
        this.persist();
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
    this.persist();
    return newChart;
  }

  /**
   * Get all saved charts.
   */
  getAll(): SavedChart[] {
    return [...this.charts].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get a chart by ID.
   */
  get(id: string): SavedChart | undefined {
    const chart = this.charts.find((c) => c.id === id);
    return chart ? { ...chart } : undefined;
  }

  /**
   * Delete a chart by ID.
   */
  delete(id: string): boolean {
    const index = this.charts.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.charts.splice(index, 1);
      this.persist();
      return true;
    }
    return false;
  }

  /**
   * Duplicate a chart.
   */
  duplicate(id: string): SavedChart | undefined {
    const original = this.get(id);
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
  exportAll(): string {
    return JSON.stringify(this.charts, null, 2);
  }

  /**
   * Import charts from JSON string.
   */
  importCharts(json: string): number {
    try {
      const imported = JSON.parse(json) as SavedChart[];
      let count = 0;
      for (const chart of imported) {
        // Generate new IDs to avoid conflicts
        const { id: _, ...rest } = chart;
        this.save(rest);
        count++;
      }
      return count;
    } catch {
      return 0;
    }
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.charts = JSON.parse(stored);
      }
    } catch {
      this.charts = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.charts));
    } catch (e) {
      // Handle QuotaExceededError gracefully
      console.warn('Failed to persist charts to localStorage:', e);
    }
  }

  private generateId(): string {
    return `chart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
