# Legend Enhancements Design

## Overview

Enhance chart legend with white text styling, dynamic statistics display (min/avg/max), and configurable layout modes (list or table).

## Requirements

1. **White text** - Title and legend text should be white for dark theme visibility
2. **Dynamic stats** - Show min/avg/max values calculated from visible data (updates on zoom)
3. **Layout modes** - Toggle between list and table display
4. **Configurable columns** - User picks which stats to show via checkboxes

## Data Model

### New LegendConfig Interface

```typescript
export interface LegendConfig {
  mode: 'list' | 'table';
  showMin: boolean;
  showAvg: boolean;
  showMax: boolean;
  showCurrent: boolean;
}
```

### SavedChart Addition

```typescript
export interface SavedChart {
  // existing fields...
  legendConfig?: LegendConfig;
}
```

### Defaults

- `mode: 'list'`
- All stats `false` (backward compatible)

## UI Configuration

New "Legend" section in ChartBuilder config panel:

```
┌─────────────────────────────────────────┐
│ Legend                                  │
├─────────────────────────────────────────┤
│ Display: [List ▼]                       │
│                                         │
│ Show Values:                            │
│ ☐ Min  ☐ Avg  ☐ Max  ☐ Current         │
└─────────────────────────────────────────┘
```

### Behavior

- `mode: 'list'` with no stats → simple legend (current behavior)
- `mode: 'list'` with stats → inline values: "ASHP Daily (min: 12, avg: 25, max: 48)"
- `mode: 'table'` → HTML table below chart with selected columns

## Chart Rendering

### White Text Styling

```typescript
title: {
  text: title,
  left: 'center',
  textStyle: { color: '#fff' }
},
legend: {
  textStyle: { color: '#fff' },
  // ... rest of config
}
```

### Stats Calculation

```typescript
private calculateStats(dataPoints: number[]): { min: number; avg: number; max: number } {
  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const avg = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  return { min, avg, max };
}
```

### Dynamic Updates on Zoom

- Listen to ECharts `dataZoom` event
- Recalculate stats for visible range
- Update legend formatter

### Table Mode

- Disable ECharts native legend
- Render custom HTML table below chart
- Show selected columns only

## Files to Modify

| File | Changes |
|------|---------|
| `chart-storage.ts` | Add `LegendConfig` interface, add to `SavedChart` |
| `chart-builder.ts` | Add Legend config section UI, state management |
| `chart-canvas.ts` | White text, stats calculation, zoom listener, table rendering |

## Backward Compatibility

Missing `legendConfig` defaults to simple list legend with no stats, preserving existing chart behavior.
