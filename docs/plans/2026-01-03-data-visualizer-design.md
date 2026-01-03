# HA Data Visualizer - Design Document

## Overview

A Home Assistant custom panel integration for on-demand, ad-hoc data visualization. Unlike dashboard-bound solutions like ApexCharts Card, this plugin provides a dedicated sidebar panel for building, viewing, and saving advanced charts without creating dashboards.

## Problem Statement

Current HA visualization options require either:
- Creating/editing dashboards with YAML configuration
- Setting up external tools like Grafana (requires DB migration)
- Using limited native statistics graphs

Users need quick, exploratory visualization - pick some data, build a chart, save it for later.

## Architecture

### Plugin Type

Home Assistant Custom Panel Integration (sidebar entry like Music Assistant, Terminal, Energy dashboard).

### Project Structure

```
ha-data-visualizer/
├── custom_components/
│   └── data_visualizer/
│       ├── __init__.py          # Integration setup
│       ├── manifest.json        # HA integration manifest
│       └── config_flow.py       # Optional configuration UI
├── frontend/
│   ├── src/
│   │   ├── main.ts              # Panel entry point
│   │   ├── components/          # UI components
│   │   ├── charts/              # ECharts wrappers
│   │   ├── query/               # NL query parser
│   │   └── storage/             # Save/load logic
│   └── package.json
└── hacs.json                    # For HACS distribution
```

### Integration Points

- **WebSocket API** - Fetch entity history, statistics, and real-time state
- **HA Frontend** - Uses HA's web component patterns (Lit Element)
- **Local Storage** - Saved charts stored in browser localStorage (MVP)

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend Framework | Lit Element | HA standard, web components |
| Charting | ECharts | Performance, flexibility, multi-axis |
| Build | Vite | Fast dev, clean HA panel bundling |
| Language | TypeScript | Type safety for complex configs |
| Styling | CSS (HA variables) | Matches HA dark/light themes |

## UI/UX Design

### Main Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Data Visualizer                            [+ New Chart]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  "Show me power usage vs cost for the last 7 days"      │ │
│ │  [Query input with NL support]                     [Go] │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    [CHART CANVAS]                           │
│                                                             │
│              Interactive ECharts render area                │
│               Zoom, pan, hover tooltips                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  CONFIG PANEL (collapsible)                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Entities     │ │ Chart Type   │ │ Time Range           │ │
│  │ [+ Add]      │ │ [Line ▼]     │ │ [Last 7 days ▼]      │ │
│  │ • sensor.pwr │ │              │ │ [Custom: ___ to ___] │ │
│  │ • sensor.cost│ │              │ │                      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                          │
│  │ Axes Config  │ │ Appearance   │  [Save Chart] [Export]  │
│  │ Left: Power  │ │ Colors, etc  │                          │
│  │ Right: Cost  │ │              │                          │
│  └──────────────┘ └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Saved Charts View

```
┌─────────────────────────────────────────────────────────────┐
│  My Charts                                   [+ New Chart]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │          │
│  │ ░ preview ░ │  │ ░ preview ░ │  │ ░ preview ░ │          │
│  │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │          │
│  │ Energy Cost │  │ Weekly COP  │  │ ASHP Stack  │          │
│  │ Last opened │  │ Last opened │  │ Last opened │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### User Workflow

1. User opens panel → sees saved charts or empty state with prompt
2. Click "New Chart" or type query → enters builder mode
3. Add entities via picker OR natural language fills them in
4. Adjust chart type, axes, time range
5. Chart renders live as config changes
6. Save → returns to saved charts view

## Entity Picker

### Features

- Groups entities by domain/area (uses HA's entity registry)
- Search/filter by name, entity_id, or area
- Shows unit of measurement to help with axis decisions
- Multi-select for quick adding

### Entity Picker UI

```
┌─────────────────────────────────────────┐
│ 🔍 Search entities...                   │
├─────────────────────────────────────────┤
│ ⚡ Energy                               │
│   ├ sensor.grid_power         [+ Add]   │
│   ├ sensor.inverter_power     [+ Add]   │
│   └ sensor.ashp_power         [+ Add]   │
│ 🌡️ Climate                              │
│   ├ sensor.outdoor_temp       [+ Add]   │
│   └ sensor.indoor_temp        [+ Add]   │
│ 💰 Cost                                 │
│   └ sensor.energy_cost        [+ Add]   │
└─────────────────────────────────────────┘
```

## Data Fetching

### API Strategy

| Data Type | API Endpoint | Use Case |
|-----------|--------------|----------|
| History | `recorder/history/period` | Raw data points for line/area charts |
| Statistics | `recorder/statistics_during_period` | Aggregated data (hourly/daily) for bar charts, long ranges |
| Current State | `states` | Live values, entity metadata |

### Smart Fetching Logic

- **< 24 hours** → Use raw history (high resolution)
- **1-7 days** → Use 5-minute statistics
- **> 7 days** → Use hourly statistics
- User can override with "high resolution" toggle if needed

### Data Transformation

- Align timestamps across entities
- Handle gaps/nulls gracefully (interpolate or show breaks)
- Normalize units where possible (e.g., Wh → kWh for readability)

## Natural Language Query Parser

### Approach

Local pattern matching for MVP. Interprets natural language queries and extracts structured intent.

### Example

```typescript
// Input: "Show me power usage vs cost for the last 7 days"
// Output:
{
  entities: ["sensor.power_usage", "sensor.cost"],
  chartType: "line",
  timeRange: { preset: "7d" },
  comparison: true  // triggers dual-axis
}
```

### Pattern Categories

| Pattern | Example | Extraction |
|---------|---------|------------|
| Entity matching | "power usage", "temperature" | Fuzzy match against entity names/ids |
| Time expressions | "last week", "past 30 days", "yesterday" | Parse to date range |
| Chart hints | "bar chart", "stacked", "pie" | Override default chart type |
| Comparisons | "vs", "compared to", "against" | Enable multi-axis |
| Aggregations | "daily", "hourly", "total" | Set grouping interval |

### Matching Strategy

1. **Tokenize** query into words/phrases
2. **Extract time** expressions first (they're most structured)
3. **Fuzzy match entities** using:
   - Entity ID (`sensor.power_usage`)
   - Friendly name ("Living Room Temperature")
   - Area + domain ("kitchen power")
4. **Detect chart modifiers** (stacked, grouped, vs)
5. **Fall back gracefully** - if ambiguous, populate what we can and let user refine in the config panel

### Example Queries MVP Should Handle

- "electricity cost last month" → single entity, 30d range
- "temperature vs humidity this week" → dual axis, 7d
- "daily power usage as bar chart" → bar, daily aggregation
- "stack grid and solar power" → stacked area/bar

## Chart Configuration

### Supported Chart Types

| Type | Best For | Multi-series Support |
|------|----------|---------------------|
| Line | Trends over time | Yes, overlaid or multi-axis |
| Area | Volume/cumulative | Yes, stacked or overlaid |
| Bar | Comparisons, discrete periods | Yes, grouped or stacked |
| Stacked Bar | Composition breakdown | Yes, shows parts of whole |
| Pie/Donut | Single-point composition | Single time point only |
| Scatter | Correlation analysis | Two entities, X vs Y |
| Heatmap | Pattern detection | Single entity over time grid |
| Gauge | Current value display | Single entity |

### Multi-Axis Configuration

```
┌─────────────────────────────────────────────────────────┐
│ Axis Configuration                                      │
├─────────────────────────────────────────────────────────┤
│ Left Axis (Y1)           │ Right Axis (Y2)             │
│ ┌─────────────────────┐  │ ┌─────────────────────────┐ │
│ │ sensor.grid_power   │  │ │ sensor.energy_cost      │ │
│ │ sensor.inverter_pwr │  │ │                         │ │
│ │ [+ Add entity]      │  │ │ [+ Add entity]          │ │
│ └─────────────────────┘  │ └─────────────────────────┘ │
│ Unit: W                  │ Unit: £                     │
│ Scale: [Auto ▼]          │ Scale: [Auto ▼]             │
│ Chart: [Stacked Bar ▼]   │ Chart: [Line ▼]             │
└─────────────────────────────────────────────────────────┘
```

### Key Features

- **Per-axis chart type** - Bars on left, line on right
- **Auto unit detection** - Groups compatible units on same axis
- **Smart suggestions** - "These entities have different units, use separate axes?"
- **Third axis** - Available via "Add Axis" for complex charts

### Target Use Cases

1. **Peak/Off-peak + Cost**: Left axis = stacked bar (power), Right axis = line (cost)
2. **Grid vs Inverter vs ASHP**: Single axis, stacked area chart
3. **COP + Temp + Power**: Three axes - Left (COP ratio), Right (°C), Far-right (W)

## Storage

### Chart Configuration Schema

```typescript
interface SavedChart {
  id: string;                    // UUID
  name: string;                  // User-defined name
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp

  // Query that created it (for re-running NL query)
  naturalQuery?: string;

  // Core config
  entities: EntityConfig[];      // Entities with axis assignment
  chartTypes: ChartTypeConfig[]; // Per-axis chart types
  timeRange: TimeRangeConfig;    // Preset or custom range

  // Appearance
  axes: AxisConfig[];            // Scale, units, position
  colors?: Record<string, string>;
  title?: string;

  // ECharts passthrough for advanced users (post-MVP)
  customOptions?: Partial<EChartsOption>;
}
```

### MVP Storage: Browser localStorage

```
Browser localStorage
└── ha-data-visualizer-charts
    └── JSON array of SavedChart objects
```

**Why localStorage for MVP:**
- Zero backend changes needed
- Works offline
- Instant read/write
- Sufficient for personal use

**Limitations (addressed post-MVP):**
- Per-browser only (switching browsers loses charts)
- Storage limit ~5-10MB (plenty for configs, not previews)

### Saved Charts List Features

- Thumbnail preview (generated on save)
- Last opened timestamp
- Rename/delete actions
- Duplicate chart as starting point

## MVP Scope

### Included

- Sidebar panel integration
- Entity picker with search/grouping
- Natural language query (local parsing)
- Chart types: Line, Area, Bar, Stacked Bar, Pie, Donut, Scatter, Heatmap, Gauge
- Multi-axis support (2-3 axes)
- Mixed chart types per axis
- Time range picker (presets + custom)
- Live chart preview
- Save/load charts (localStorage)
- Basic appearance controls (colors, title)

### Not Included (Post-MVP)

| Feature | Priority |
|---------|----------|
| Pre-canned templates | High |
| Export chart as image | High |
| Shareable configs (import/export JSON) | Medium |
| Dashboard bridge (export to card) | Medium |
| LLM-powered queries (via HA Assist) | Medium |
| Server-side storage (HA storage API) | Low |
| Annotations on charts | Low |

## Distribution

HACS (Home Assistant Community Store):
- Register as custom integration + panel
- Single install via HACS for both backend + frontend
