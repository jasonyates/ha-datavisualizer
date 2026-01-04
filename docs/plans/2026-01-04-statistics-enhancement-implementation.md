# Statistics Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add statistics types (change/mean/sum), time-based grouping, per-entity chart config, and dual Y-axis support to properly display energy sensors.

**Architecture:** Enhance DataFetcher to accept statistics type and grouping period per entity, compute deltas for `change` type. Update ChartBuilder UI with per-entity configuration cards. Fix ChartCanvas for proper bar rendering and dual Y-axis.

**Tech Stack:** TypeScript, Lit Element, ECharts, Vitest

---

## Phase 1: Data Layer

### Task 1: Add Statistics Utility for Delta Calculation

**Files:**
- Create: `frontend/src/utils/statistics.ts`
- Create: `frontend/src/utils/statistics.test.ts`

**Step 1: Write the failing test**

Create `frontend/src/utils/statistics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateChange, type DataPoint } from './statistics';

describe('calculateChange', () => {
  it('should calculate deltas between consecutive values', () => {
    const data: DataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 2000, value: 150 },
      { timestamp: 3000, value: 180 },
    ];

    const result = calculateChange(data);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ timestamp: 2000, value: 50 });
    expect(result[1]).toEqual({ timestamp: 3000, value: 30 });
  });

  it('should return empty array for single data point', () => {
    const data: DataPoint[] = [{ timestamp: 1000, value: 100 }];
    const result = calculateChange(data);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    const result = calculateChange([]);
    expect(result).toEqual([]);
  });

  it('should handle negative deltas', () => {
    const data: DataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 2000, value: 80 },
    ];

    const result = calculateChange(data);

    expect(result[0].value).toBe(-20);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/utils/statistics.test.ts`
Expected: FAIL - Cannot find module './statistics'

**Step 3: Create utils directory and statistics.ts**

```bash
mkdir -p frontend/src/utils
```

Create `frontend/src/utils/statistics.ts`:

```typescript
export interface DataPoint {
  timestamp: number;
  value: number;
}

/**
 * Calculate the change (delta) between consecutive data points.
 * Used for energy sensors to show daily usage instead of cumulative totals.
 */
export function calculateChange(data: DataPoint[]): DataPoint[] {
  if (data.length < 2) return [];

  const result: DataPoint[] = [];
  for (let i = 1; i < data.length; i++) {
    result.push({
      timestamp: data[i].timestamp,
      value: data[i].value - data[i - 1].value,
    });
  }
  return result;
}

/**
 * Extract a specific statistic type from raw statistics data.
 */
export type StatisticsType = 'state' | 'mean' | 'min' | 'max' | 'sum' | 'change';
export type GroupingPeriod = 'hour' | 'day' | 'week' | 'month';
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/utils/statistics.test.ts`
Expected: PASS - All 4 tests pass

**Step 5: Commit**

```bash
git add frontend/src/utils/
git commit -m "feat: add statistics utility for delta calculation"
```

---

### Task 2: Add Axis Assignment Utility

**Files:**
- Create: `frontend/src/utils/axis-assignment.ts`
- Create: `frontend/src/utils/axis-assignment.test.ts`

**Step 1: Write the failing test**

Create `frontend/src/utils/axis-assignment.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { assignAxes, type EntityWithUnit } from './axis-assignment';

describe('assignAxes', () => {
  it('should assign entities with same unit to same axis', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power1', unit: 'kWh' },
      { entityId: 'sensor.power2', unit: 'kWh' },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power1']).toBe('left');
    expect(result['sensor.power2']).toBe('left');
  });

  it('should assign different units to different axes', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power', unit: 'kWh' },
      { entityId: 'sensor.cost', unit: '£' },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power']).toBe('left');
    expect(result['sensor.cost']).toBe('right');
  });

  it('should assign first unit type to left axis', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.cost', unit: '£' },
      { entityId: 'sensor.power', unit: 'kWh' },
    ];

    const result = assignAxes(entities);

    // First encountered unit gets left
    expect(result['sensor.cost']).toBe('left');
    expect(result['sensor.power']).toBe('right');
  });

  it('should handle more than 2 unit types (third+ goes to right)', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power', unit: 'kWh' },
      { entityId: 'sensor.cost', unit: '£' },
      { entityId: 'sensor.temp', unit: '°C' },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power']).toBe('left');
    expect(result['sensor.cost']).toBe('right');
    expect(result['sensor.temp']).toBe('right');
  });

  it('should handle entities without units', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power', unit: 'kWh' },
      { entityId: 'sensor.unknown', unit: undefined },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power']).toBe('left');
    expect(result['sensor.unknown']).toBe('right');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/utils/axis-assignment.test.ts`
Expected: FAIL - Cannot find module './axis-assignment'

**Step 3: Write minimal implementation**

Create `frontend/src/utils/axis-assignment.ts`:

```typescript
export interface EntityWithUnit {
  entityId: string;
  unit: string | undefined;
}

export type AxisId = 'left' | 'right';

/**
 * Automatically assign entities to Y-axes based on their units.
 * First unit type goes to left axis, second to right axis.
 * Entities with same unit share an axis.
 */
export function assignAxes(entities: EntityWithUnit[]): Record<string, AxisId> {
  const result: Record<string, AxisId> = {};
  const unitToAxis: Record<string, AxisId> = {};
  let axisCount = 0;

  for (const entity of entities) {
    const unit = entity.unit ?? '__no_unit__';

    if (!(unit in unitToAxis)) {
      // Assign new unit to next available axis
      unitToAxis[unit] = axisCount === 0 ? 'left' : 'right';
      axisCount++;
    }

    result[entity.entityId] = unitToAxis[unit];
  }

  return result;
}

/**
 * Get default statistics type based on unit.
 * Energy units default to 'change', others to 'mean'.
 */
export function getDefaultStatisticsType(unit: string | undefined): 'change' | 'mean' {
  const energyUnits = ['kWh', 'Wh', 'MWh', 'm³', 'ft³', 'gal', 'L'];
  if (unit && energyUnits.includes(unit)) {
    return 'change';
  }
  return 'mean';
}

/**
 * Get default grouping period based on unit.
 * Energy units default to 'day', others to 'hour'.
 */
export function getDefaultGroupingPeriod(unit: string | undefined): 'day' | 'hour' {
  const energyUnits = ['kWh', 'Wh', 'MWh', 'm³', 'ft³', 'gal', 'L'];
  if (unit && energyUnits.includes(unit)) {
    return 'day';
  }
  return 'hour';
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/utils/axis-assignment.test.ts`
Expected: PASS - All 5 tests pass

**Step 5: Commit**

```bash
git add frontend/src/utils/axis-assignment.ts frontend/src/utils/axis-assignment.test.ts
git commit -m "feat: add axis assignment utility with smart defaults"
```

---

### Task 3: Update EntityConfig Interface

**Files:**
- Modify: `frontend/src/storage/chart-storage.ts`

**Step 1: Update the interface**

In `frontend/src/storage/chart-storage.ts`, update `EntityConfig`:

```typescript
import type { StatisticsType, GroupingPeriod } from '../utils/statistics';

export interface EntityConfig {
  entityId: string;
  axisId: 'left' | 'right';
  chartType: 'bar' | 'line' | 'area';
  statisticsType: StatisticsType;
  groupingPeriod: GroupingPeriod;
  color?: string;
}
```

**Step 2: Run tests to verify nothing breaks**

Run: `cd frontend && npm run test -- src/storage/chart-storage.test.ts`
Expected: PASS - Tests should still pass (existing tests use compatible structure)

**Step 3: Update ChartTypeConfig (remove, no longer needed)**

Remove `ChartTypeConfig` interface as chart type is now per-entity:

```typescript
// REMOVE this interface:
// export interface ChartTypeConfig {
//   axisId: string;
//   type: 'line' | 'bar' | 'area';
//   stacked?: boolean;
// }
```

Update `SavedChart` interface:

```typescript
export interface SavedChart {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  naturalQuery?: string;
  entities: EntityConfig[];
  // Remove: chartTypes: ChartTypeConfig[];
  timeRange: TimeRangeConfig;
  axes: AxisConfig[];
  colors?: Record<string, string>;
  title?: string;
}
```

**Step 4: Update chart-storage tests**

Update tests in `frontend/src/storage/chart-storage.test.ts` to use new structure:

```typescript
// Update test chart objects to include new fields
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
```

**Step 5: Run tests and fix any failures**

Run: `cd frontend && npm run test -- src/storage/chart-storage.test.ts`
Expected: PASS after updates

**Step 6: Commit**

```bash
git add frontend/src/storage/chart-storage.ts frontend/src/storage/chart-storage.test.ts
git commit -m "refactor: update EntityConfig with per-entity chart settings"
```

---

### Task 4: Enhance DataFetcher for Statistics Types

**Files:**
- Modify: `frontend/src/services/data-fetcher.ts`
- Modify: `frontend/src/services/data-fetcher.test.ts`

**Step 1: Update the interface**

Update `frontend/src/services/data-fetcher.ts`:

```typescript
import type { HaApi } from './ha-api';
import { calculateChange, type StatisticsType, type GroupingPeriod } from '../utils/statistics';

export interface ChartDataPoint {
  timestamp: number;
  value: number;
}

export interface EntityDataSeries {
  entityId: string;
  name: string;
  unit: string;
  dataPoints: ChartDataPoint[];
}

export interface FetchOptions {
  statisticsType: StatisticsType;
  groupingPeriod: GroupingPeriod;
}

export class DataFetcher {
  constructor(private api: HaApi) {}

  /**
   * Fetch data for an entity with specified statistics type and grouping.
   */
  async fetchData(
    entityId: string,
    start: Date,
    end: Date,
    options: FetchOptions
  ): Promise<EntityDataSeries> {
    const state = this.api.getState(entityId);
    const unit = (state?.attributes?.unit_of_measurement as string) || '';
    const name = (state?.attributes?.friendly_name as string) || entityId;

    // Map grouping period to HA API period
    const period = this.mapGroupingPeriod(options.groupingPeriod);

    // Fetch statistics
    const stats = await this.api.getStatistics(entityId, start, end, period);

    // Extract data points based on statistics type
    let dataPoints = this.extractDataPoints(stats, options.statisticsType);

    // For 'change' type, calculate deltas
    if (options.statisticsType === 'change') {
      dataPoints = calculateChange(dataPoints);
    }

    return {
      entityId,
      name,
      unit,
      dataPoints,
    };
  }

  /**
   * Fetch data for multiple entities with individual options.
   */
  async fetchMultiple(
    entities: Array<{ entityId: string; options: FetchOptions }>,
    start: Date,
    end: Date
  ): Promise<EntityDataSeries[]> {
    return Promise.all(
      entities.map(({ entityId, options }) =>
        this.fetchData(entityId, start, end, options)
      )
    );
  }

  private mapGroupingPeriod(period: GroupingPeriod): '5minute' | 'hour' | 'day' | 'week' | 'month' {
    switch (period) {
      case 'hour': return 'hour';
      case 'day': return 'day';
      case 'week': return 'week';
      case 'month': return 'month';
      default: return 'hour';
    }
  }

  private extractDataPoints(
    stats: Array<{ start: string; mean?: number; min?: number; max?: number; sum?: number; state?: number }>,
    statisticsType: StatisticsType
  ): ChartDataPoint[] {
    return stats
      .map((item) => {
        let value: number | undefined;
        switch (statisticsType) {
          case 'mean': value = item.mean; break;
          case 'min': value = item.min; break;
          case 'max': value = item.max; break;
          case 'sum': value = item.sum; break;
          case 'state': value = item.state; break;
          case 'change': value = item.state ?? item.sum ?? item.mean; break;
        }
        return {
          timestamp: new Date(item.start).getTime(),
          value: value ?? 0,
        };
      })
      .filter((point) => !isNaN(point.value));
  }
}
```

**Step 2: Update tests**

Update `frontend/src/services/data-fetcher.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataFetcher } from './data-fetcher';
import { HaApi } from './ha-api';

vi.mock('./ha-api');

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
        { start: start.toISOString(), mean: 100 },
        { start: now.toISOString(), mean: 150 },
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
        { start: start.toISOString(), state: 100 },
        { start: new Date(start.getTime() + 86400000).toISOString(), state: 150 },
        { start: now.toISOString(), state: 180 },
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
});
```

**Step 3: Run tests**

Run: `cd frontend && npm run test -- src/services/data-fetcher.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/src/services/data-fetcher.ts frontend/src/services/data-fetcher.test.ts
git commit -m "feat: enhance DataFetcher with statistics types and grouping"
```

---

## Phase 2: Chart Rendering

### Task 5: Fix ChartCanvas for Proper Bar and Dual Axis

**Files:**
- Modify: `frontend/src/components/chart-canvas.ts`

**Step 1: Update ChartConfig interface**

```typescript
import type { EntityDataSeries } from '../services/data-fetcher';

export interface SeriesConfig {
  entityId: string;
  chartType: 'bar' | 'line' | 'area';
  axisId: 'left' | 'right';
  color?: string;
}

export interface AxisInfo {
  id: 'left' | 'right';
  unit: string;
  name?: string;
}

export interface ChartConfig {
  title?: string;
  series: EntityDataSeries[];
  seriesConfig: SeriesConfig[];
  axes: AxisInfo[];
  showLegend?: boolean;
  showTooltip?: boolean;
}
```

**Step 2: Update buildChartOption method**

```typescript
private buildChartOption(config: ChartConfig): EChartsOption {
  const { series, seriesConfig, axes, title, showLegend = true, showTooltip = true } = config;

  // Build y-axes (max 2)
  const yAxis = axes.map((axis, index) => ({
    type: 'value' as const,
    name: axis.name || axis.unit,
    position: axis.id === 'left' ? 'left' : 'right',
    axisLine: { show: true },
    axisLabel: {
      formatter: (value: number) => {
        if (Math.abs(value) >= 1000) {
          return `${(value / 1000).toFixed(1)}k`;
        }
        return `${value}`;
      },
    },
    splitLine: { show: index === 0 }, // Only show grid for left axis
  }));

  // Build series with proper chart types
  const chartSeries = series.map((s) => {
    const cfg = seriesConfig.find((c) => c.entityId === s.entityId);
    const axisIndex = axes.findIndex((a) => a.id === cfg?.axisId);

    const baseSeries = {
      name: s.name,
      yAxisIndex: axisIndex >= 0 ? axisIndex : 0,
      data: s.dataPoints.map((p) => [p.timestamp, p.value]),
      itemStyle: cfg?.color ? { color: cfg.color } : undefined,
    };

    if (cfg?.chartType === 'bar') {
      return {
        ...baseSeries,
        type: 'bar' as const,
        barMaxWidth: 50,
      };
    } else if (cfg?.chartType === 'area') {
      return {
        ...baseSeries,
        type: 'line' as const,
        smooth: true,
        areaStyle: {},
      };
    } else {
      return {
        ...baseSeries,
        type: 'line' as const,
        smooth: true,
      };
    }
  });

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: showTooltip ? {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        const date = new Date(params[0].value[0]);
        const dateStr = date.toLocaleDateString();
        let html = `<strong>${dateStr}</strong><br/>`;
        for (const p of params) {
          const seriesData = series.find((s) => s.name === p.seriesName);
          const unit = seriesData?.unit || '';
          html += `${p.marker} ${p.seriesName}: ${p.value[1]?.toFixed(2)} ${unit}<br/>`;
        }
        return html;
      },
    } : undefined,
    legend: showLegend ? {
      data: series.map((s) => s.name),
      bottom: 0,
    } : undefined,
    grid: {
      left: '10%',
      right: axes.length > 1 ? '10%' : '5%',
      bottom: showLegend ? '15%' : '10%',
      top: title ? '15%' : '10%',
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value: number) => {
          const date = new Date(value);
          return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
        },
      },
    },
    yAxis,
    series: chartSeries,
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
    ],
  };
}
```

**Step 3: Run build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add frontend/src/components/chart-canvas.ts
git commit -m "fix: proper bar chart rendering and dual Y-axis support"
```

---

## Phase 3: UI Enhancement

### Task 6: Create Entity Config Card Component

**Files:**
- Create: `frontend/src/components/entity-config-card.ts`

**Step 1: Create the component**

Create `frontend/src/components/entity-config-card.ts`:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StatisticsType, GroupingPeriod } from '../utils/statistics';

export interface EntityCardConfig {
  entityId: string;
  name: string;
  unit: string;
  axisId: 'left' | 'right';
  chartType: 'bar' | 'line' | 'area';
  statisticsType: StatisticsType;
  groupingPeriod: GroupingPeriod;
}

@customElement('entity-config-card')
export class EntityConfigCard extends LitElement {
  @property({ type: Object }) config!: EntityCardConfig;

  static styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .name {
      font-weight: 500;
      font-size: 14px;
    }

    .axis-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }

    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: var(--secondary-text-color, #666);
      padding: 0 4px;
    }

    .remove-btn:hover {
      color: var(--error-color, #f44336);
    }

    .controls {
      display: flex;
      gap: 8px;
    }

    .control-group {
      flex: 1;
    }

    .control-group label {
      display: block;
      font-size: 10px;
      color: var(--secondary-text-color, #666);
      margin-bottom: 4px;
    }

    select {
      width: 100%;
      padding: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #000);
      font-size: 12px;
    }
  `;

  protected render() {
    return html`
      <div class="card">
        <div class="header">
          <span class="name">${this.config.name}</span>
          <div>
            <span class="axis-badge">${this.config.axisId === 'left' ? 'Left' : 'Right'}</span>
            <button class="remove-btn" @click=${this._handleRemove}>×</button>
          </div>
        </div>
        <div class="controls">
          <div class="control-group">
            <label>Chart</label>
            <select .value=${this.config.chartType} @change=${this._handleChartTypeChange}>
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
            </select>
          </div>
          <div class="control-group">
            <label>Stats</label>
            <select .value=${this.config.statisticsType} @change=${this._handleStatsChange}>
              <option value="state">State</option>
              <option value="mean">Mean</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="sum">Sum</option>
              <option value="change">Change</option>
            </select>
          </div>
          <div class="control-group">
            <label>Group</label>
            <select .value=${this.config.groupingPeriod} @change=${this._handleGroupingChange}>
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  private _handleRemove() {
    this.dispatchEvent(new CustomEvent('remove', {
      detail: { entityId: this.config.entityId },
      bubbles: true,
      composed: true,
    }));
  }

  private _handleChartTypeChange(e: Event) {
    const chartType = (e.target as HTMLSelectElement).value as 'bar' | 'line' | 'area';
    this._dispatchConfigChange({ chartType });
  }

  private _handleStatsChange(e: Event) {
    const statisticsType = (e.target as HTMLSelectElement).value as StatisticsType;
    this._dispatchConfigChange({ statisticsType });
  }

  private _handleGroupingChange(e: Event) {
    const groupingPeriod = (e.target as HTMLSelectElement).value as GroupingPeriod;
    this._dispatchConfigChange({ groupingPeriod });
  }

  private _dispatchConfigChange(changes: Partial<EntityCardConfig>) {
    this.dispatchEvent(new CustomEvent('config-change', {
      detail: { entityId: this.config.entityId, changes },
      bubbles: true,
      composed: true,
    }));
  }
}
```

**Step 2: Run build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/components/entity-config-card.ts
git commit -m "feat: add EntityConfigCard component for per-entity settings"
```

---

### Task 7: Update ChartBuilder to Use New Components

**Files:**
- Modify: `frontend/src/components/chart-builder.ts`

**Step 1: Update imports and state**

Add imports at top:

```typescript
import './entity-config-card';
import type { EntityCardConfig } from './entity-config-card';
import { assignAxes, getDefaultStatisticsType, getDefaultGroupingPeriod } from '../utils/axis-assignment';
import type { StatisticsType, GroupingPeriod } from '../utils/statistics';
```

Update state to use new EntityConfig:

```typescript
import type { EntityConfig } from '../storage/chart-storage';

@state() private selectedEntities: EntityConfig[] = [];
```

**Step 2: Update handleEntitySelected**

```typescript
private handleEntitySelected(e: CustomEvent): void {
  const entity = e.detail.entity as HassEntityRegistry;
  const state = this.hass.states[entity.entity_id];
  const unit = state?.attributes?.unit_of_measurement as string | undefined;

  if (!this.selectedEntities.find((se) => se.entityId === entity.entity_id)) {
    const newEntity: EntityConfig = {
      entityId: entity.entity_id,
      axisId: 'left', // Will be reassigned
      chartType: unit && ['kWh', 'Wh', 'MWh', 'm³'].includes(unit) ? 'bar' : 'line',
      statisticsType: getDefaultStatisticsType(unit),
      groupingPeriod: getDefaultGroupingPeriod(unit),
    };

    const updatedEntities = [...this.selectedEntities, newEntity];

    // Reassign axes based on units
    const entitiesWithUnits = updatedEntities.map((e) => ({
      entityId: e.entityId,
      unit: (this.hass.states[e.entityId]?.attributes?.unit_of_measurement as string) || undefined,
    }));
    const axisAssignments = assignAxes(entitiesWithUnits);

    this.selectedEntities = updatedEntities.map((e) => ({
      ...e,
      axisId: axisAssignments[e.entityId],
    }));

    this.fetchChartData();
  }
  this.showEntityPicker = false;
}
```

**Step 3: Update entity list rendering**

Replace the entity chips section with entity config cards:

```typescript
<div class="config-section">
  <h3>Entities</h3>
  <div class="entity-list">
    ${this.selectedEntities.map((entity) => {
      const state = this.hass.states[entity.entityId];
      const name = state?.attributes?.friendly_name || entity.entityId;
      const unit = state?.attributes?.unit_of_measurement || '';
      return html`
        <entity-config-card
          .config=${{
            ...entity,
            name,
            unit,
          }}
          @remove=${this._handleEntityRemove}
          @config-change=${this._handleEntityConfigChange}
        ></entity-config-card>
      `;
    })}
  </div>
  <button class="add-btn" @click=${() => this.showEntityPicker = true}>+ Add Entity</button>
</div>
```

**Step 4: Add event handlers**

```typescript
private _handleEntityRemove(e: CustomEvent) {
  const entityId = e.detail.entityId;
  this.selectedEntities = this.selectedEntities.filter((e) => e.entityId !== entityId);
  this._reassignAxes();
  this.fetchChartData();
}

private _handleEntityConfigChange(e: CustomEvent) {
  const { entityId, changes } = e.detail;
  this.selectedEntities = this.selectedEntities.map((entity) =>
    entity.entityId === entityId ? { ...entity, ...changes } : entity
  );
  this.fetchChartData();
}

private _reassignAxes() {
  const entitiesWithUnits = this.selectedEntities.map((e) => ({
    entityId: e.entityId,
    unit: (this.hass.states[e.entityId]?.attributes?.unit_of_measurement as string) || undefined,
  }));
  const axisAssignments = assignAxes(entitiesWithUnits);
  this.selectedEntities = this.selectedEntities.map((e) => ({
    ...e,
    axisId: axisAssignments[e.entityId],
  }));
}
```

**Step 5: Update fetchChartData**

```typescript
private async fetchChartData(): Promise<void> {
  if (this.selectedEntities.length === 0) {
    this.chartData = [];
    return;
  }

  this.loading = true;
  this.error = '';

  const { start, end } = QueryParser.presetToDateRange(this.timeRangePreset);

  try {
    const entities = this.selectedEntities.map((e) => ({
      entityId: e.entityId,
      options: {
        statisticsType: e.statisticsType,
        groupingPeriod: e.groupingPeriod,
      },
    }));

    this.chartData = await this.dataFetcher.fetchMultiple(entities, start, end);
  } catch (e) {
    console.error('Failed to fetch chart data:', e);
    this.error = 'Failed to load chart data. Please try again.';
  } finally {
    this.loading = false;
  }
}
```

**Step 6: Update buildChartConfig**

```typescript
private buildChartConfig(): ChartConfig {
  // Build axes info from entities
  const unitToAxis = new Map<string, 'left' | 'right'>();
  const axesInfo: AxisInfo[] = [];

  for (const entity of this.selectedEntities) {
    const state = this.hass.states[entity.entityId];
    const unit = (state?.attributes?.unit_of_measurement as string) || '';

    if (!unitToAxis.has(unit)) {
      const axisId = unitToAxis.size === 0 ? 'left' : 'right';
      unitToAxis.set(unit, axisId);
      axesInfo.push({ id: axisId, unit });
    }
  }

  // Ensure we have at least one axis
  if (axesInfo.length === 0) {
    axesInfo.push({ id: 'left', unit: '' });
  }

  return {
    title: this.chartTitle || undefined,
    series: this.chartData,
    seriesConfig: this.selectedEntities.map((e) => ({
      entityId: e.entityId,
      chartType: e.chartType,
      axisId: e.axisId,
    })),
    axes: axesInfo,
    showLegend: true,
    showTooltip: true,
  };
}
```

**Step 7: Remove old global chart type dropdown**

Remove the Chart Type config-section from render (now per-entity).

**Step 8: Run build and fix any errors**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 9: Commit**

```bash
git add frontend/src/components/chart-builder.ts
git commit -m "feat: integrate per-entity config cards with auto axis assignment"
```

---

### Task 8: Final Build, Test, and Push

**Step 1: Run all tests**

Run: `cd frontend && npm run test -- --run`
Expected: All tests pass

**Step 2: Run production build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit built assets**

```bash
git add custom_components/data_visualizer/frontend/ha-data-visualizer.js
git commit -m "build: update compiled frontend with statistics enhancement"
```

**Step 4: Push to GitHub**

```bash
git push
```

**Step 5: Update on HA for testing**

On HA terminal:
```bash
cd /config/custom_components
rm -rf data_visualizer
wget https://github.com/jasonyates/ha-datavisualizer/archive/refs/heads/main.zip
unzip -o main.zip
mv ha-datavisualizer-main/custom_components/data_visualizer ./
rm -rf ha-datavisualizer-main main.zip
```

Restart HA and test.

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | statistics.ts | Delta calculation utility |
| 2 | axis-assignment.ts | Auto-assign axes by unit |
| 3 | chart-storage.ts | Update EntityConfig interface |
| 4 | data-fetcher.ts | Statistics types & grouping |
| 5 | chart-canvas.ts | Bar chart & dual axis fix |
| 6 | entity-config-card.ts | Per-entity config UI |
| 7 | chart-builder.ts | Integrate new components |
| 8 | Final | Build, test, deploy |
