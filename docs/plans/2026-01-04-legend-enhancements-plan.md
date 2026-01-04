# Legend Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add configurable legend with white text, dynamic min/avg/max stats, and list/table display modes.

**Architecture:** Extend SavedChart with LegendConfig interface. ChartBuilder adds config UI section. ChartCanvas handles white text styling, stats calculation on visible data, dataZoom listener for updates, and table mode rendering below chart.

**Tech Stack:** TypeScript, Lit, ECharts, Vitest

---

## Task 1: Add LegendConfig Interface

**Files:**
- Modify: `frontend/src/storage/chart-storage.ts:1-38`
- Modify: `frontend/src/storage/chart-storage.test.ts`

**Step 1: Write failing test for LegendConfig in SavedChart**

Add to `frontend/src/storage/chart-storage.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --run chart-storage.test.ts`
Expected: FAIL - type errors for legendConfig property

**Step 3: Add LegendConfig interface and update SavedChart**

In `frontend/src/storage/chart-storage.ts`, add after line 25 (after TimeRangeConfig):

```typescript
export interface LegendConfig {
  mode: 'list' | 'table';
  showMin: boolean;
  showAvg: boolean;
  showMax: boolean;
  showCurrent: boolean;
}
```

Then update SavedChart interface to add after `title?: string;`:

```typescript
  legendConfig?: LegendConfig;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --run chart-storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/storage/chart-storage.ts frontend/src/storage/chart-storage.test.ts
git commit -m "feat: add LegendConfig interface to SavedChart"
```

---

## Task 2: Add White Text Styling to Chart

**Files:**
- Modify: `frontend/src/components/chart-canvas.ts:100-200`
- Modify: `frontend/src/components/chart-canvas.test.ts`

**Step 1: Write failing test for white text styling**

Add to `frontend/src/components/chart-canvas.test.ts`:

```typescript
describe('white text styling', () => {
  it('should set white color for title text', () => {
    const config: ChartConfig = {
      title: 'Test Title',
      series: [],
      seriesConfig: [],
      axes: [{ id: 'left', unit: '' }],
    };

    const canvas = new ChartCanvas();
    const option = (canvas as any).buildChartOption(config);

    expect(option.title?.textStyle?.color).toBe('#fff');
  });

  it('should set white color for legend text', () => {
    const config: ChartConfig = {
      series: [{ entityId: 'sensor.test', name: 'Test', unit: '', dataPoints: [] }],
      seriesConfig: [],
      axes: [{ id: 'left', unit: '' }],
      showLegend: true,
    };

    const canvas = new ChartCanvas();
    const option = (canvas as any).buildChartOption(config);

    expect(option.legend?.textStyle?.color).toBe('#fff');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --run chart-canvas.test.ts`
Expected: FAIL - textStyle.color is undefined

**Step 3: Update buildChartOption for white text**

In `frontend/src/components/chart-canvas.ts`, update the return statement in `buildChartOption` (around line 157):

Change:
```typescript
title: title ? { text: title, left: 'center' } : undefined,
```

To:
```typescript
title: title ? { text: title, left: 'center', textStyle: { color: '#fff' } } : undefined,
```

Change:
```typescript
legend: showLegend ? {
  data: series.map((s) => s.name),
  bottom: 0,
} : undefined,
```

To:
```typescript
legend: showLegend ? {
  data: series.map((s) => s.name),
  bottom: 0,
  textStyle: { color: '#fff' },
} : undefined,
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --run chart-canvas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/components/chart-canvas.ts frontend/src/components/chart-canvas.test.ts
git commit -m "feat: add white text styling to chart title and legend"
```

---

## Task 3: Add Stats Calculation Helper

**Files:**
- Modify: `frontend/src/components/chart-canvas.ts`
- Modify: `frontend/src/components/chart-canvas.test.ts`

**Step 1: Write failing test for stats calculation**

Add to `frontend/src/components/chart-canvas.test.ts`:

```typescript
describe('calculateStats', () => {
  it('should calculate min, avg, max from data points', () => {
    const canvas = new ChartCanvas();
    const dataPoints = [10, 20, 30, 40, 50];

    const stats = (canvas as any).calculateStats(dataPoints);

    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);
    expect(stats.avg).toBe(30);
  });

  it('should handle single value', () => {
    const canvas = new ChartCanvas();
    const dataPoints = [42];

    const stats = (canvas as any).calculateStats(dataPoints);

    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
    expect(stats.avg).toBe(42);
  });

  it('should handle decimal values', () => {
    const canvas = new ChartCanvas();
    const dataPoints = [1.5, 2.5, 3.5];

    const stats = (canvas as any).calculateStats(dataPoints);

    expect(stats.min).toBe(1.5);
    expect(stats.max).toBe(3.5);
    expect(stats.avg).toBeCloseTo(2.5);
  });

  it('should return zeros for empty array', () => {
    const canvas = new ChartCanvas();
    const dataPoints: number[] = [];

    const stats = (canvas as any).calculateStats(dataPoints);

    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.avg).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --run chart-canvas.test.ts`
Expected: FAIL - calculateStats is not a function

**Step 3: Implement calculateStats method**

In `frontend/src/components/chart-canvas.ts`, add after line 85 (after setupResizeObserver method):

```typescript
private calculateStats(dataPoints: number[]): { min: number; avg: number; max: number } {
  if (dataPoints.length === 0) {
    return { min: 0, avg: 0, max: 0 };
  }
  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const avg = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  return { min, avg, max };
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --run chart-canvas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/components/chart-canvas.ts frontend/src/components/chart-canvas.test.ts
git commit -m "feat: add calculateStats helper method"
```

---

## Task 4: Extend ChartConfig with LegendConfig

**Files:**
- Modify: `frontend/src/components/chart-canvas.ts:20-28`

**Step 1: Import LegendConfig and update ChartConfig interface**

In `frontend/src/components/chart-canvas.ts`, update import at line 5:

```typescript
import type { EntityDataSeries } from '../services/data-fetcher';
import type { LegendConfig } from '../storage/chart-storage';
```

Then update ChartConfig interface to add:

```typescript
export interface ChartConfig {
  title?: string;
  series: EntityDataSeries[];
  seriesConfig: SeriesConfig[];
  axes: AxisInfo[];
  showLegend?: boolean;
  showTooltip?: boolean;
  legendConfig?: LegendConfig;
}
```

**Step 2: Verify build passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add frontend/src/components/chart-canvas.ts
git commit -m "feat: add legendConfig to ChartConfig interface"
```

---

## Task 5: Add Legend Config UI to ChartBuilder

**Files:**
- Modify: `frontend/src/components/chart-builder.ts`
- Modify: `frontend/src/storage/chart-storage.ts` (import)

**Step 1: Add legendConfig state to ChartBuilder**

In `frontend/src/components/chart-builder.ts`, add import at line 7:

```typescript
import { ChartStorage, type EntityConfig, type LegendConfig } from '../storage/chart-storage';
```

Add state after line 27 (after `private error = '';`):

```typescript
@state() private legendConfig: LegendConfig = {
  mode: 'list',
  showMin: false,
  showAvg: false,
  showMax: false,
  showCurrent: false,
};
```

**Step 2: Add Legend config section to render method**

In `frontend/src/components/chart-builder.ts`, add inside config-panel div (after Title section, around line 276):

```typescript
<div class="config-section">
  <h3>Legend</h3>
  <label>
    Display:
    <select
      .value=${this.legendConfig.mode}
      @change=${(e: Event) => {
        this.legendConfig = {
          ...this.legendConfig,
          mode: (e.target as HTMLSelectElement).value as 'list' | 'table',
        };
      }}
    >
      <option value="list">List</option>
      <option value="table">Table</option>
    </select>
  </label>
  <div class="legend-checkboxes">
    <label>
      <input
        type="checkbox"
        .checked=${this.legendConfig.showMin}
        @change=${(e: Event) => {
          this.legendConfig = {
            ...this.legendConfig,
            showMin: (e.target as HTMLInputElement).checked,
          };
        }}
      />
      Min
    </label>
    <label>
      <input
        type="checkbox"
        .checked=${this.legendConfig.showAvg}
        @change=${(e: Event) => {
          this.legendConfig = {
            ...this.legendConfig,
            showAvg: (e.target as HTMLInputElement).checked,
          };
        }}
      />
      Avg
    </label>
    <label>
      <input
        type="checkbox"
        .checked=${this.legendConfig.showMax}
        @change=${(e: Event) => {
          this.legendConfig = {
            ...this.legendConfig,
            showMax: (e.target as HTMLInputElement).checked,
          };
        }}
      />
      Max
    </label>
    <label>
      <input
        type="checkbox"
        .checked=${this.legendConfig.showCurrent}
        @change=${(e: Event) => {
          this.legendConfig = {
            ...this.legendConfig,
            showCurrent: (e.target as HTMLInputElement).checked,
          };
        }}
      />
      Current
    </label>
  </div>
</div>
```

**Step 3: Add CSS for legend checkboxes**

In `frontend/src/components/chart-builder.ts`, add to static styles:

```css
.legend-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.legend-checkboxes label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  cursor: pointer;
}

.config-section label {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

**Step 4: Update buildChartConfig to include legendConfig**

In `frontend/src/components/chart-builder.ts`, update `buildChartConfig` method to include legendConfig in the return:

```typescript
return {
  title: this.chartTitle || undefined,
  series: this.chartData,
  seriesConfig,
  axes: axesInfo,
  showLegend: true,
  showTooltip: true,
  legendConfig: this.legendConfig,
};
```

**Step 5: Verify build passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add frontend/src/components/chart-builder.ts
git commit -m "feat: add legend config UI section to ChartBuilder"
```

---

## Task 6: Persist LegendConfig in Save/Load

**Files:**
- Modify: `frontend/src/components/chart-builder.ts`

**Step 1: Update handleSave to include legendConfig**

In `frontend/src/components/chart-builder.ts`, update the `handleSave` method. In the `storage.save()` call, add `legendConfig`:

```typescript
const chart = await this.storage.save({
  id: this.chartId,
  name: this.chartTitle || `Chart ${new Date().toLocaleDateString()}`,
  entities: this.selectedEntities,
  axes,
  timeRange: { preset: this.timeRangePreset },
  title: this.chartTitle,
  legendConfig: this.legendConfig,
});
```

**Step 2: Update loadChart to restore legendConfig**

In `frontend/src/components/chart-builder.ts`, update the `loadChart` method to restore legendConfig:

```typescript
private async loadChart(id: string): Promise<void> {
  const chart = await this.storage.get(id);
  if (!chart) return;

  this.selectedEntities = chart.entities;
  this.timeRangePreset = chart.timeRange.preset || '24h';
  this.chartTitle = chart.title || '';
  this.legendConfig = chart.legendConfig || {
    mode: 'list',
    showMin: false,
    showAvg: false,
    showMax: false,
    showCurrent: false,
  };

  this.fetchChartData();
}
```

**Step 3: Verify build passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Manual test**

1. Start dev server: `cd frontend && npm run dev`
2. Create chart, toggle legend options, save
3. Reload page, open chart - verify legend options persisted

**Step 5: Commit**

```bash
git add frontend/src/components/chart-builder.ts
git commit -m "feat: persist legendConfig in chart save/load"
```

---

## Task 7: Implement Legend Formatter with Stats

**Files:**
- Modify: `frontend/src/components/chart-canvas.ts`

**Step 1: Update buildChartOption to format legend with stats**

In `frontend/src/components/chart-canvas.ts`, update the legend section in `buildChartOption` to use a formatter when stats are enabled:

```typescript
private buildChartOption(config: ChartConfig): EChartsOption {
  const { series, seriesConfig, axes, title, showLegend = true, showTooltip = true, legendConfig } = config;

  // Calculate stats for each series if needed
  const seriesStats = new Map<string, { min: number; avg: number; max: number; current: number }>();
  if (legendConfig && (legendConfig.showMin || legendConfig.showAvg || legendConfig.showMax || legendConfig.showCurrent)) {
    for (const s of series) {
      const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
      const stats = this.calculateStats(values);
      const current = values.length > 0 ? values[values.length - 1] : 0;
      seriesStats.set(s.name, { ...stats, current });
    }
  }

  // Build legend formatter
  const legendFormatter = (name: string) => {
    if (!legendConfig || legendConfig.mode === 'table') {
      return name;
    }
    const stats = seriesStats.get(name);
    if (!stats) return name;

    const parts: string[] = [];
    if (legendConfig.showMin) parts.push(`min: ${stats.min.toFixed(1)}`);
    if (legendConfig.showAvg) parts.push(`avg: ${stats.avg.toFixed(1)}`);
    if (legendConfig.showMax) parts.push(`max: ${stats.max.toFixed(1)}`);
    if (legendConfig.showCurrent) parts.push(`current: ${stats.current.toFixed(1)}`);

    if (parts.length === 0) return name;
    return `${name} (${parts.join(', ')})`;
  };

  // ... rest of method continues with existing code ...
```

Then update the legend config in the return statement:

```typescript
legend: showLegend && legendConfig?.mode !== 'table' ? {
  data: series.map((s) => s.name),
  bottom: 0,
  textStyle: { color: '#fff' },
  formatter: legendFormatter,
} : undefined,
```

**Step 2: Verify build passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Manual test**

1. Start dev server
2. Create chart with entities
3. Enable Min/Avg/Max checkboxes
4. Verify legend shows stats inline: "ASHP Daily (min: 12.0, avg: 25.0, max: 48.0)"

**Step 4: Commit**

```bash
git add frontend/src/components/chart-canvas.ts
git commit -m "feat: add legend formatter with inline stats"
```

---

## Task 8: Add Table Mode Rendering

**Files:**
- Modify: `frontend/src/components/chart-canvas.ts`

**Step 1: Add state for table stats**

In `frontend/src/components/chart-canvas.ts`, add state property after line 34:

```typescript
@state() private tableStats: Array<{
  name: string;
  color: string;
  min: number;
  avg: number;
  max: number;
  current: number;
}> = [];
```

Add import for `state` decorator at line 2:

```typescript
import { customElement, property, query, state } from 'lit/decorators.js';
```

**Step 2: Update render method for table mode**

In `frontend/src/components/chart-canvas.ts`, update render method:

```typescript
protected render() {
  const showTable = this.config?.legendConfig?.mode === 'table';
  return html`
    <div class="chart-container"></div>
    ${showTable ? this.renderStatsTable() : ''}
  `;
}

private renderStatsTable() {
  const cfg = this.config?.legendConfig;
  if (!cfg) return '';

  const hasStats = cfg.showMin || cfg.showAvg || cfg.showMax || cfg.showCurrent;
  if (!hasStats && this.tableStats.length === 0) return '';

  return html`
    <table class="stats-table">
      <thead>
        <tr>
          <th>Series</th>
          ${cfg.showMin ? html`<th>Min</th>` : ''}
          ${cfg.showAvg ? html`<th>Avg</th>` : ''}
          ${cfg.showMax ? html`<th>Max</th>` : ''}
          ${cfg.showCurrent ? html`<th>Current</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${this.tableStats.map(stat => html`
          <tr>
            <td>
              <span class="color-dot" style="background: ${stat.color}"></span>
              ${stat.name}
            </td>
            ${cfg.showMin ? html`<td>${stat.min.toFixed(2)}</td>` : ''}
            ${cfg.showAvg ? html`<td>${stat.avg.toFixed(2)}</td>` : ''}
            ${cfg.showMax ? html`<td>${stat.max.toFixed(2)}</td>` : ''}
            ${cfg.showCurrent ? html`<td>${stat.current.toFixed(2)}</td>` : ''}
          </tr>
        `)}
      </tbody>
    </table>
  `;
}
```

**Step 3: Add CSS for stats table**

In `frontend/src/components/chart-canvas.ts`, update static styles:

```css
static styles = css`
  :host {
    display: block;
    width: 100%;
  }

  .chart-container {
    width: 100%;
    height: 400px;
  }

  .stats-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 14px;
    color: #fff;
  }

  .stats-table th,
  .stats-table td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stats-table th {
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
  }

  .stats-table td:not(:first-child) {
    text-align: right;
    font-family: monospace;
  }

  .color-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
  }
`;
```

**Step 4: Update updateChart to populate tableStats**

In `frontend/src/components/chart-canvas.ts`, update `updateChart` method:

```typescript
private updateChart(): void {
  if (!this.chart || !this.config) return;

  const option = this.buildChartOption(this.config);
  this.chart.setOption(option, { notMerge: false });

  // Update table stats if in table mode
  if (this.config.legendConfig?.mode === 'table') {
    this.updateTableStats();
  }
}

private updateTableStats(): void {
  if (!this.config) return;

  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

  this.tableStats = this.config.series.map((s, index) => {
    const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
    const stats = this.calculateStats(values);
    const current = values.length > 0 ? values[values.length - 1] : 0;

    const cfg = this.config?.seriesConfig.find(c => c.entityId === s.entityId);
    const color = cfg?.color || colors[index % colors.length];

    return {
      name: s.name,
      color,
      ...stats,
      current,
    };
  });
}
```

**Step 5: Verify build passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 6: Manual test**

1. Start dev server
2. Create chart, select "Table" mode
3. Enable some stats columns
4. Verify table appears below chart with selected columns

**Step 7: Commit**

```bash
git add frontend/src/components/chart-canvas.ts
git commit -m "feat: add table mode rendering for legend stats"
```

---

## Task 9: Add DataZoom Listener for Dynamic Stats

**Files:**
- Modify: `frontend/src/components/chart-canvas.ts`

**Step 1: Add visible range state**

In `frontend/src/components/chart-canvas.ts`, add state after tableStats:

```typescript
@state() private visibleRange?: { start: number; end: number };
```

**Step 2: Add dataZoom event listener in initChart**

Update `initChart` method:

```typescript
private initChart(): void {
  if (!this.chartContainer) return;

  this.chart = echarts.init(this.chartContainer, undefined, {
    renderer: 'canvas',
  });

  // Listen for zoom events to update stats
  this.chart.on('dataZoom', () => {
    this.handleDataZoom();
  });
}
```

**Step 3: Implement handleDataZoom method**

Add after initChart:

```typescript
private handleDataZoom(): void {
  if (!this.chart || !this.config) return;

  const option = this.chart.getOption() as any;
  const dataZoom = option.dataZoom?.[0];

  if (dataZoom && dataZoom.startValue !== undefined && dataZoom.endValue !== undefined) {
    this.visibleRange = {
      start: dataZoom.startValue,
      end: dataZoom.endValue,
    };
  } else {
    this.visibleRange = undefined;
  }

  // Recalculate stats for visible range
  this.updateStatsForVisibleRange();
}

private updateStatsForVisibleRange(): void {
  if (!this.config) return;

  const cfg = this.config.legendConfig;
  if (!cfg || (!cfg.showMin && !cfg.showAvg && !cfg.showMax && !cfg.showCurrent)) return;

  // Filter data to visible range
  const filteredSeries = this.config.series.map(s => {
    let points = s.dataPoints;
    if (this.visibleRange) {
      points = s.dataPoints.filter(p =>
        p.timestamp >= this.visibleRange!.start && p.timestamp <= this.visibleRange!.end
      );
    }
    return { ...s, dataPoints: points };
  });

  // Recalculate stats
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

  this.tableStats = filteredSeries.map((s, index) => {
    const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
    const stats = this.calculateStats(values);
    const current = values.length > 0 ? values[values.length - 1] : 0;

    const seriesCfg = this.config?.seriesConfig.find(c => c.entityId === s.entityId);
    const color = seriesCfg?.color || colors[index % colors.length];

    return {
      name: s.name,
      color,
      ...stats,
      current,
    };
  });

  // Update legend formatter if in list mode
  if (cfg.mode === 'list' && this.chart) {
    const option = this.buildChartOptionForVisibleRange(filteredSeries);
    this.chart.setOption({ legend: option.legend }, { notMerge: false });
  }
}

private buildChartOptionForVisibleRange(filteredSeries: EntityDataSeries[]): Partial<EChartsOption> {
  const cfg = this.config?.legendConfig;
  if (!cfg) return {};

  const seriesStats = new Map<string, { min: number; avg: number; max: number; current: number }>();
  for (const s of filteredSeries) {
    const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
    const stats = this.calculateStats(values);
    const current = values.length > 0 ? values[values.length - 1] : 0;
    seriesStats.set(s.name, { ...stats, current });
  }

  const legendFormatter = (name: string) => {
    const stats = seriesStats.get(name);
    if (!stats) return name;

    const parts: string[] = [];
    if (cfg.showMin) parts.push(`min: ${stats.min.toFixed(1)}`);
    if (cfg.showAvg) parts.push(`avg: ${stats.avg.toFixed(1)}`);
    if (cfg.showMax) parts.push(`max: ${stats.max.toFixed(1)}`);
    if (cfg.showCurrent) parts.push(`current: ${stats.current.toFixed(1)}`);

    if (parts.length === 0) return name;
    return `${name} (${parts.join(', ')})`;
  };

  return {
    legend: {
      formatter: legendFormatter,
    },
  };
}
```

**Step 4: Add EntityDataSeries import**

Update import at top of file:

```typescript
import type { EntityDataSeries } from '../services/data-fetcher';
```

**Step 5: Verify build passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 6: Manual test**

1. Start dev server
2. Create chart with stats enabled
3. Zoom in on chart (scroll or pinch)
4. Verify stats update to reflect visible data range

**Step 7: Commit**

```bash
git add frontend/src/components/chart-canvas.ts
git commit -m "feat: add dataZoom listener for dynamic stats updates"
```

---

## Task 10: Run Full Test Suite and Fix Issues

**Files:**
- All test files

**Step 1: Run full test suite**

Run: `cd frontend && npm test -- --run`

**Step 2: Fix any failing tests**

Review failures and fix as needed.

**Step 3: Run build**

Run: `cd frontend && npm run build`

**Step 4: Manual end-to-end test**

1. Create new chart with multiple entities
2. Enable all legend stats (Min, Avg, Max, Current)
3. Test list mode - verify inline stats
4. Switch to table mode - verify table appears
5. Zoom chart - verify stats update
6. Save chart
7. Reload and reopen - verify config persisted

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address test failures from legend enhancements"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add LegendConfig interface |
| 2 | Add white text styling |
| 3 | Add stats calculation helper |
| 4 | Extend ChartConfig with LegendConfig |
| 5 | Add Legend config UI |
| 6 | Persist legendConfig in save/load |
| 7 | Implement legend formatter with stats |
| 8 | Add table mode rendering |
| 9 | Add dataZoom listener for dynamic stats |
| 10 | Run tests and fix issues |
