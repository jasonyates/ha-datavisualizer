# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All frontend commands run from `frontend/` directory:

```bash
npm run build      # TypeScript compile + Vite build → outputs to custom_components/data_visualizer/frontend/
npm run dev        # Vite dev server
npm test -- --run  # Run all tests once
npm test -- --run src/components/chart-canvas.test.ts  # Run single test file
npm run lint       # ESLint
```

## Architecture

This is a Home Assistant custom panel integration for data visualization.

### Two-Part Structure

**Python backend** (`custom_components/data_visualizer/`): Registers a sidebar panel and serves the frontend JS. Minimal code - just wires up the panel to Home Assistant.

**TypeScript frontend** (`frontend/src/`): Lit-based web components that render in Home Assistant's UI. Communicates with HA via WebSocket API (passed as `hass` property).

### Frontend Component Hierarchy

```
ha-data-visualizer          # Root panel - list/builder view router
  └── chart-builder         # Main editing UI - entity selection, config, preview
        ├── entity-picker   # Modal for selecting entities (grouped by area)
        ├── entity-config-card  # Per-entity settings (chart type, stats, grouping)
        └── chart-canvas    # ECharts wrapper - renders the actual chart
```

### Data Flow

1. `HaApi` wraps Home Assistant's WebSocket calls (entity registry, device registry, statistics)
2. `DataFetcher` fetches time-series data for entities using HA's recorder statistics API
3. `ChartStorage` persists saved charts to HA's user data storage via WebSocket
4. `chart-canvas` receives config and data, builds ECharts options, renders chart

### Key Interfaces

- `EntityConfig`: Per-entity settings (axis, chart type, statistics type, grouping period)
- `SavedChart`: Full chart configuration stored in HA
- `ChartConfig`: Runtime config passed to chart-canvas for rendering
- `EntityDataSeries`: Time-series data returned by DataFetcher

### Home Assistant Integration Points

- `hass.callWS()` for WebSocket messages (entity/device/area registries, statistics, user storage)
- `hass.states` for current entity states and attributes
- Charts stored via `frontend/get_user_data` and `frontend/set_user_data` WebSocket types

## Git Commits

- Do NOT include "Co-Authored-By" lines in commit messages
- Do NOT include "Generated with Claude Code" in commit messages
- Keep commit messages simple and focused on the change itself
