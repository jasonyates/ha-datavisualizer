# Statistics Enhancement Design

## Overview

Enhance the Data Visualizer to properly support energy sensors and other cumulative data by adding statistics types (change/mean/sum/etc.), time-based grouping, and per-entity chart configuration.

## Problem Statement

Current implementation shows raw cumulative values instead of daily deltas for energy sensors. A sensor showing 800 kWh total should display as ~20-50 kWh daily bars. ApexCharts achieves this with `statistics.type: change` and `group_by.duration: 1d`.

## Statistics Types

| Type | Calculation | Use Case |
|------|-------------|----------|
| `state` | Raw value at each period | Current readings (temp, power) |
| `mean` | Average over period | Smoothing noisy sensors |
| `min` | Minimum in period | Low point detection |
| `max` | Maximum in period | Peak detection |
| `sum` | Sum/total in period | Total accumulated |
| `change` | Difference from previous period | Daily energy usage deltas |

For `change` type: `value[n] - value[n-1]` computed on fetched statistics.

## Grouping Periods

- Hourly → HA API period: `hour`
- Daily → HA API period: `day`
- Weekly → HA API period: `week`
- Monthly → HA API period: `month`

## Data Layer

### Enhanced Entity Configuration

```typescript
interface EntityConfig {
  entityId: string;
  axisId: string;           // Auto-assigned by unit
  chartType: 'bar' | 'line' | 'area';
  statisticsType: 'state' | 'mean' | 'min' | 'max' | 'sum' | 'change';
  groupingPeriod: 'hour' | 'day' | 'week' | 'month';
  color?: string;
}
```

### Auto-Axis Assignment

1. Fetch entity states to get `unit_of_measurement`
2. Group entities by unit
3. Assign first unit group to left axis
4. Assign second unit group to right axis
5. Max 2 axes for clarity

### Smart Defaults

When entity is added:
- If unit is `kWh`, `Wh`, `m³`: default to `change` + `day`
- Otherwise: default to `mean` + `hour`

## UI Configuration

Replace simple entity chips with expandable entity cards:

```
┌─────────────────────────────────────────────────────┐
│ Entities                                            │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ ASHP Daily Usage                    [Left] [×]  │ │
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐      │ │
│ │ │ Bar    ▼ │ │ Change ▼ │ │ Daily   ▼ │      │ │
│ │ └───────────┘ └───────────┘ └───────────┘      │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ASHP Daily Cost                    [Right] [×]  │ │
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐      │ │
│ │ │ Line   ▼ │ │ Change ▼ │ │ Daily   ▼ │      │ │
│ │ └───────────┘ └───────────┘ └───────────┘      │ │
│ └─────────────────────────────────────────────────┘ │
│ [+ Add Entity]                                      │
└─────────────────────────────────────────────────────┘
```

Dropdowns per entity:
- Chart: Bar, Line, Area
- Stats: State, Mean, Min, Max, Sum, Change
- Group: Hourly, Daily, Weekly, Monthly

## ECharts Rendering

### Proper Bar Chart

```typescript
series: {
  type: 'bar',
  barWidth: '60%',
  yAxisIndex: 0,  // or 1 for right axis
}
```

### Dual Y-Axis

```typescript
yAxis: [
  { type: 'value', position: 'left', name: 'kWh' },
  { type: 'value', position: 'right', name: '£' }
]
```

### Time Axis Formatting

Format based on grouping period:
- Daily: "06 Dec"
- Hourly: "06 Dec 14:00"

## Files to Modify

| File | Changes |
|------|---------|
| `services/data-fetcher.ts` | Add statisticsType, groupingPeriod; compute deltas |
| `services/ha-api.ts` | Update getStatistics period handling |
| `storage/chart-storage.ts` | Update EntityConfig interface |
| `components/chart-builder.ts` | Per-entity config UI, auto-axis |
| `components/chart-canvas.ts` | Fix bar rendering, dual axis |
| `components/entity-picker.ts` | Return unit_of_measurement |

## New Utilities

- `utils/axis-assignment.ts` - Auto-group entities by unit
- `utils/statistics.ts` - Delta calculation for `change` type

## Testing

- Update data-fetcher tests for new params
- Add axis-assignment utility tests
- Manual testing with real HA data
