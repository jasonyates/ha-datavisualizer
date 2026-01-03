# HA Data Visualizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Home Assistant custom panel integration for on-demand data visualization with entity picker, natural language queries, and multi-axis ECharts.

**Architecture:** Custom HA integration registers a sidebar panel. Frontend built with Lit Element + ECharts connects to HA via WebSocket API. Charts saved to browser localStorage.

**Tech Stack:** Python (HA integration), TypeScript, Lit Element, ECharts, Vite

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Frontend Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/.gitignore`

**Step 1: Create frontend directory and package.json**

```bash
mkdir -p frontend
```

Create `frontend/package.json`:

```json
{
  "name": "ha-data-visualizer",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "echarts": "^5.5.0",
    "lit": "^3.1.0",
    "fuse.js": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  },
  "include": ["src"]
}
```

**Step 3: Create vite.config.ts**

Create `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'HaDataVisualizer',
      fileName: 'ha-data-visualizer',
      formats: ['es'],
    },
    outDir: '../custom_components/data_visualizer/frontend',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'ha-data-visualizer.js',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
```

**Step 4: Create .gitignore**

Create `frontend/.gitignore`:

```
node_modules/
dist/
*.local
.DS_Store
```

**Step 5: Install dependencies**

Run: `cd frontend && npm install`
Expected: Dependencies installed, `node_modules/` created

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: initialize frontend project with Vite, Lit, ECharts"
```

---

### Task 2: Create HA Integration Structure

**Files:**
- Create: `custom_components/data_visualizer/__init__.py`
- Create: `custom_components/data_visualizer/manifest.json`
- Create: `custom_components/data_visualizer/const.py`

**Step 1: Create integration directory**

```bash
mkdir -p custom_components/data_visualizer
```

**Step 2: Create manifest.json**

Create `custom_components/data_visualizer/manifest.json`:

```json
{
  "domain": "data_visualizer",
  "name": "Data Visualizer",
  "codeowners": [],
  "config_flow": false,
  "dependencies": ["frontend", "recorder", "websocket_api"],
  "documentation": "https://github.com/yourusername/ha-data-visualizer",
  "iot_class": "local_polling",
  "issue_tracker": "https://github.com/yourusername/ha-data-visualizer/issues",
  "requirements": [],
  "version": "0.1.0"
}
```

**Step 3: Create const.py**

Create `custom_components/data_visualizer/const.py`:

```python
"""Constants for Data Visualizer integration."""

DOMAIN = "data_visualizer"
PANEL_URL = "/data-visualizer"
PANEL_TITLE = "Data Visualizer"
PANEL_ICON = "mdi:chart-box"
FRONTEND_SCRIPT_URL = "/local/community/data_visualizer/ha-data-visualizer.js"
```

**Step 4: Create __init__.py**

Create `custom_components/data_visualizer/__init__.py`:

```python
"""Data Visualizer integration for Home Assistant."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, PANEL_URL, PANEL_TITLE, PANEL_ICON

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Data Visualizer integration."""

    # Register the frontend panel
    frontend_path = Path(__file__).parent / "frontend"

    # Serve the frontend files
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/data_visualizer_frontend",
            str(frontend_path),
            cache_headers=False,
        )
    ])

    # Register the panel
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path="data-visualizer",
        config={
            "_panel_custom": {
                "name": "ha-data-visualizer",
                "embed_iframe": False,
                "trust_external": False,
                "module_url": "/data_visualizer_frontend/ha-data-visualizer.js",
            }
        },
        require_admin=False,
    )

    _LOGGER.info("Data Visualizer panel registered")
    return True
```

**Step 5: Create frontend placeholder**

```bash
mkdir -p custom_components/data_visualizer/frontend
touch custom_components/data_visualizer/frontend/.gitkeep
```

**Step 6: Commit**

```bash
git add custom_components/
git commit -m "feat: add HA integration structure with panel registration"
```

---

### Task 3: Create Frontend Entry Point

**Files:**
- Create: `frontend/src/main.ts`
- Create: `frontend/src/ha-data-visualizer.ts`
- Create: `frontend/src/types/homeassistant.ts`

**Step 1: Create types directory and HA types**

```bash
mkdir -p frontend/src/types
```

Create `frontend/src/types/homeassistant.ts`:

```typescript
/**
 * Type definitions for Home Assistant frontend integration.
 * These mirror the types from HA's frontend repo.
 */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HassEntityRegistry {
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  disabled_by: string | null;
  area_id: string | null;
  device_id: string | null;
  original_name: string | null;
}

export interface HassArea {
  area_id: string;
  name: string;
  picture: string | null;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  services: Record<string, Record<string, unknown>>;
  user: {
    id: string;
    name: string;
    is_admin: boolean;
  };
  language: string;
  locale: {
    language: string;
    number_format: string;
    time_format: string;
  };
  themes: {
    darkMode: boolean;
    theme: string;
  };
  connection: HassConnection;
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
  callApi: <T>(method: string, path: string, data?: unknown) => Promise<T>;
}

export interface HassConnection {
  subscribeEvents: (
    callback: (event: unknown) => void,
    eventType?: string
  ) => Promise<() => void>;
  sendMessagePromise: <T>(msg: Record<string, unknown>) => Promise<T>;
}

export interface HassHistoryResult {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HassStatisticsResult {
  statistic_id: string;
  start: string;
  end: string;
  mean?: number;
  min?: number;
  max?: number;
  sum?: number;
  state?: number;
}

declare global {
  interface HTMLElementTagNameMap {
    'ha-data-visualizer': HaDataVisualizer;
  }
}

export type HaDataVisualizer = import('../ha-data-visualizer').HaDataVisualizer;
```

**Step 2: Create main panel component**

Create `frontend/src/ha-data-visualizer.ts`:

```typescript
import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from './types/homeassistant';

@customElement('ha-data-visualizer')
export class HaDataVisualizer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @property({ type: String }) public route = '';

  @state() private _view: 'list' | 'builder' = 'list';

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
      color: var(--primary-text-color);
    }

    .container {
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
    }

    .new-chart-btn {
      background-color: var(--primary-color);
      color: var(--text-primary-color);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .new-chart-btn:hover {
      opacity: 0.9;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: var(--secondary-text-color);
    }

    .empty-state p {
      margin-bottom: 16px;
    }
  `;

  protected render() {
    return html`
      <div class="container">
        <div class="header">
          <h1>Data Visualizer</h1>
          <button class="new-chart-btn" @click=${this._handleNewChart}>
            + New Chart
          </button>
        </div>

        ${this._view === 'list' ? this._renderChartList() : this._renderBuilder()}
      </div>
    `;
  }

  private _renderChartList() {
    return html`
      <div class="empty-state">
        <p>No saved charts yet.</p>
        <button class="new-chart-btn" @click=${this._handleNewChart}>
          Create your first chart
        </button>
      </div>
    `;
  }

  private _renderBuilder() {
    return html`
      <div class="builder">
        <p>Chart builder coming soon...</p>
        <button @click=${() => this._view = 'list'}>Back to list</button>
      </div>
    `;
  }

  private _handleNewChart() {
    this._view = 'builder';
  }
}
```

**Step 3: Create main.ts entry point**

Create `frontend/src/main.ts`:

```typescript
/**
 * HA Data Visualizer - Entry Point
 *
 * This file exports the main panel component for Home Assistant.
 */

export { HaDataVisualizer } from './ha-data-visualizer';
```

**Step 4: Build and verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds, `custom_components/data_visualizer/frontend/ha-data-visualizer.js` created

**Step 5: Commit**

```bash
git add frontend/src/
git add custom_components/data_visualizer/frontend/
git commit -m "feat: add panel entry point with empty state UI"
```

---

## Phase 2: Data Layer

### Task 4: Create HA API Service

**Files:**
- Create: `frontend/src/services/ha-api.ts`
- Create: `frontend/src/services/ha-api.test.ts`

**Step 1: Write the failing test**

Create `frontend/src/services/ha-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HaApi } from './ha-api';
import type { HomeAssistant } from '../types/homeassistant';

describe('HaApi', () => {
  let mockHass: HomeAssistant;
  let api: HaApi;

  beforeEach(() => {
    mockHass = {
      callWS: vi.fn(),
      states: {},
    } as unknown as HomeAssistant;
    api = new HaApi(mockHass);
  });

  describe('getEntityRegistry', () => {
    it('should fetch entity registry via websocket', async () => {
      const mockRegistry = [
        { entity_id: 'sensor.power', name: 'Power' },
        { entity_id: 'sensor.temp', name: 'Temperature' },
      ];
      vi.mocked(mockHass.callWS).mockResolvedValue(mockRegistry);

      const result = await api.getEntityRegistry();

      expect(mockHass.callWS).toHaveBeenCalledWith({ type: 'config/entity_registry/list' });
      expect(result).toEqual(mockRegistry);
    });
  });

  describe('getHistory', () => {
    it('should fetch history for entity within time range', async () => {
      const mockHistory = [[
        { entity_id: 'sensor.power', state: '100', last_changed: '2024-01-01T00:00:00Z' },
      ]];
      vi.mocked(mockHass.callWS).mockResolvedValue(mockHistory);

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');
      const result = await api.getHistory('sensor.power', start, end);

      expect(mockHass.callWS).toHaveBeenCalledWith({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: ['sensor.power'],
        minimal_response: true,
        significant_changes_only: false,
      });
      expect(result).toEqual(mockHistory[0]);
    });
  });

  describe('getStatistics', () => {
    it('should fetch statistics for entity within time range', async () => {
      const mockStats = {
        'sensor.power': [
          { start: '2024-01-01T00:00:00Z', mean: 100 },
        ],
      };
      vi.mocked(mockHass.callWS).mockResolvedValue(mockStats);

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');
      const result = await api.getStatistics('sensor.power', start, end, 'hour');

      expect(mockHass.callWS).toHaveBeenCalledWith({
        type: 'recorder/statistics_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: ['sensor.power'],
        period: 'hour',
      });
      expect(result).toEqual(mockStats['sensor.power']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/services/ha-api.test.ts`
Expected: FAIL - Cannot find module './ha-api'

**Step 3: Create services directory and ha-api.ts**

```bash
mkdir -p frontend/src/services
```

Create `frontend/src/services/ha-api.ts`:

```typescript
import type {
  HomeAssistant,
  HassEntityRegistry,
  HassHistoryResult,
  HassStatisticsResult,
  HassArea,
} from '../types/homeassistant';

export type StatisticsPeriod = '5minute' | 'hour' | 'day' | 'week' | 'month';

export class HaApi {
  constructor(private hass: HomeAssistant) {}

  /**
   * Fetch the entity registry (all registered entities with metadata).
   */
  async getEntityRegistry(): Promise<HassEntityRegistry[]> {
    return this.hass.callWS<HassEntityRegistry[]>({
      type: 'config/entity_registry/list',
    });
  }

  /**
   * Fetch area registry.
   */
  async getAreas(): Promise<HassArea[]> {
    return this.hass.callWS<HassArea[]>({
      type: 'config/area_registry/list',
    });
  }

  /**
   * Fetch raw history data for an entity within a time range.
   * Best for short time ranges (< 24 hours).
   */
  async getHistory(
    entityId: string,
    start: Date,
    end: Date
  ): Promise<HassHistoryResult[]> {
    const result = await this.hass.callWS<HassHistoryResult[][]>({
      type: 'history/history_during_period',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      entity_ids: [entityId],
      minimal_response: true,
      significant_changes_only: false,
    });
    return result[0] || [];
  }

  /**
   * Fetch aggregated statistics for an entity.
   * Best for longer time ranges (> 24 hours).
   */
  async getStatistics(
    entityId: string,
    start: Date,
    end: Date,
    period: StatisticsPeriod = 'hour'
  ): Promise<HassStatisticsResult[]> {
    const result = await this.hass.callWS<Record<string, HassStatisticsResult[]>>({
      type: 'recorder/statistics_during_period',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      statistic_ids: [entityId],
      period,
    });
    return result[entityId] || [];
  }

  /**
   * Get current state of an entity.
   */
  getState(entityId: string) {
    return this.hass.states[entityId];
  }

  /**
   * Get all current states.
   */
  getAllStates() {
    return this.hass.states;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/services/ha-api.test.ts`
Expected: PASS - All tests pass

**Step 5: Commit**

```bash
git add frontend/src/services/
git commit -m "feat: add HA API service for entity registry, history, statistics"
```

---

### Task 5: Create Data Fetching Service with Smart Resolution

**Files:**
- Create: `frontend/src/services/data-fetcher.ts`
- Create: `frontend/src/services/data-fetcher.test.ts`

**Step 1: Write the failing test**

Create `frontend/src/services/data-fetcher.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataFetcher, type ChartDataPoint } from './data-fetcher';
import { HaApi } from './ha-api';

vi.mock('./ha-api');

describe('DataFetcher', () => {
  let mockApi: HaApi;
  let fetcher: DataFetcher;

  beforeEach(() => {
    mockApi = {
      getHistory: vi.fn(),
      getStatistics: vi.fn(),
      getState: vi.fn(),
    } as unknown as HaApi;
    fetcher = new DataFetcher(mockApi);
  });

  describe('fetchData', () => {
    it('should use history API for ranges under 24 hours', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      vi.mocked(mockApi.getHistory).mockResolvedValue([
        { entity_id: 'sensor.power', state: '100', last_changed: start.toISOString() } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W' },
      } as any);

      await fetcher.fetchData('sensor.power', start, now);

      expect(mockApi.getHistory).toHaveBeenCalled();
      expect(mockApi.getStatistics).not.toHaveBeenCalled();
    });

    it('should use statistics API with 5minute period for 1-7 day ranges', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      vi.mocked(mockApi.getStatistics).mockResolvedValue([
        { statistic_id: 'sensor.power', start: start.toISOString(), mean: 100 } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W' },
      } as any);

      await fetcher.fetchData('sensor.power', start, now);

      expect(mockApi.getStatistics).toHaveBeenCalledWith(
        'sensor.power',
        start,
        now,
        '5minute'
      );
    });

    it('should use statistics API with hour period for ranges over 7 days', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago

      vi.mocked(mockApi.getStatistics).mockResolvedValue([
        { statistic_id: 'sensor.power', start: start.toISOString(), mean: 100 } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W' },
      } as any);

      await fetcher.fetchData('sensor.power', start, now);

      expect(mockApi.getStatistics).toHaveBeenCalledWith(
        'sensor.power',
        start,
        now,
        'hour'
      );
    });

    it('should return normalized data points', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      vi.mocked(mockApi.getHistory).mockResolvedValue([
        { entity_id: 'sensor.power', state: '100', last_changed: start.toISOString() } as any,
        { entity_id: 'sensor.power', state: '150', last_changed: now.toISOString() } as any,
      ]);
      vi.mocked(mockApi.getState).mockReturnValue({
        attributes: { unit_of_measurement: 'W', friendly_name: 'Power' },
      } as any);

      const result = await fetcher.fetchData('sensor.power', start, now);

      expect(result.entityId).toBe('sensor.power');
      expect(result.unit).toBe('W');
      expect(result.name).toBe('Power');
      expect(result.dataPoints).toHaveLength(2);
      expect(result.dataPoints[0]).toEqual({
        timestamp: start.getTime(),
        value: 100,
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/services/data-fetcher.test.ts`
Expected: FAIL - Cannot find module './data-fetcher'

**Step 3: Write minimal implementation**

Create `frontend/src/services/data-fetcher.ts`:

```typescript
import type { HaApi, StatisticsPeriod } from './ha-api';

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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export class DataFetcher {
  constructor(private api: HaApi) {}

  /**
   * Fetch data for an entity with automatic resolution selection.
   * - < 24 hours: raw history (high resolution)
   * - 1-7 days: 5-minute statistics
   * - > 7 days: hourly statistics
   */
  async fetchData(
    entityId: string,
    start: Date,
    end: Date,
    forceResolution?: 'history' | StatisticsPeriod
  ): Promise<EntityDataSeries> {
    const state = this.api.getState(entityId);
    const unit = (state?.attributes?.unit_of_measurement as string) || '';
    const name = (state?.attributes?.friendly_name as string) || entityId;

    const rangeMs = end.getTime() - start.getTime();
    let dataPoints: ChartDataPoint[];

    if (forceResolution === 'history' || (!forceResolution && rangeMs < DAY_MS)) {
      // Use raw history for short ranges
      dataPoints = await this.fetchHistoryData(entityId, start, end);
    } else {
      // Use statistics for longer ranges
      const period = this.selectStatisticsPeriod(rangeMs, forceResolution);
      dataPoints = await this.fetchStatisticsData(entityId, start, end, period);
    }

    return {
      entityId,
      name,
      unit,
      dataPoints,
    };
  }

  /**
   * Fetch data for multiple entities in parallel.
   */
  async fetchMultiple(
    entityIds: string[],
    start: Date,
    end: Date
  ): Promise<EntityDataSeries[]> {
    return Promise.all(
      entityIds.map((id) => this.fetchData(id, start, end))
    );
  }

  private selectStatisticsPeriod(
    rangeMs: number,
    forceResolution?: StatisticsPeriod
  ): StatisticsPeriod {
    if (forceResolution) return forceResolution;

    if (rangeMs <= 7 * DAY_MS) {
      return '5minute';
    }
    return 'hour';
  }

  private async fetchHistoryData(
    entityId: string,
    start: Date,
    end: Date
  ): Promise<ChartDataPoint[]> {
    const history = await this.api.getHistory(entityId, start, end);

    return history
      .map((item) => ({
        timestamp: new Date(item.last_changed).getTime(),
        value: parseFloat(item.state),
      }))
      .filter((point) => !isNaN(point.value));
  }

  private async fetchStatisticsData(
    entityId: string,
    start: Date,
    end: Date,
    period: StatisticsPeriod
  ): Promise<ChartDataPoint[]> {
    const stats = await this.api.getStatistics(entityId, start, end, period);

    return stats
      .map((item) => ({
        timestamp: new Date(item.start).getTime(),
        value: item.mean ?? item.sum ?? item.state ?? 0,
      }))
      .filter((point) => !isNaN(point.value));
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/services/data-fetcher.test.ts`
Expected: PASS - All tests pass

**Step 5: Commit**

```bash
git add frontend/src/services/data-fetcher.ts frontend/src/services/data-fetcher.test.ts
git commit -m "feat: add DataFetcher with smart resolution selection"
```

---

## Phase 3: Chart Components

### Task 6: Create ECharts Wrapper Component

**Files:**
- Create: `frontend/src/components/chart-canvas.ts`
- Create: `frontend/src/components/chart-canvas.test.ts`

**Step 1: Write the failing test**

Create `frontend/src/components/chart-canvas.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html, expect as expectEl } from '@open-wc/testing';
import './chart-canvas';
import type { ChartCanvas } from './chart-canvas';

// Mock ECharts
vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    getOption: vi.fn(() => ({})),
  })),
}));

describe('ChartCanvas', () => {
  it('should render a chart container', async () => {
    const el = await fixture<ChartCanvas>(html`<chart-canvas></chart-canvas>`);
    const container = el.shadowRoot?.querySelector('.chart-container');
    expect(container).toBeTruthy();
  });

  it('should initialize echarts on first update', async () => {
    const echarts = await import('echarts');
    const el = await fixture<ChartCanvas>(html`<chart-canvas></chart-canvas>`);
    await el.updateComplete;

    expect(echarts.init).toHaveBeenCalled();
  });
});
```

**Step 2: Install testing dependencies**

Add to `frontend/package.json` devDependencies:
```json
"@open-wc/testing": "^4.0.0"
```

Run: `cd frontend && npm install`

**Step 3: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/components/chart-canvas.test.ts`
Expected: FAIL - Cannot find module './chart-canvas'

**Step 4: Create components directory and chart-canvas.ts**

```bash
mkdir -p frontend/src/components
```

Create `frontend/src/components/chart-canvas.ts`:

```typescript
import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import type { EntityDataSeries } from '../services/data-fetcher';

export interface AxisConfig {
  id: string;
  position: 'left' | 'right';
  name?: string;
  unit?: string;
  entityIds: string[];
  chartType: 'line' | 'bar' | 'area';
  stacked?: boolean;
}

export interface ChartConfig {
  title?: string;
  series: EntityDataSeries[];
  axes: AxisConfig[];
  showLegend?: boolean;
  showTooltip?: boolean;
}

@customElement('chart-canvas')
export class ChartCanvas extends LitElement {
  @property({ type: Object }) config?: ChartConfig;

  @query('.chart-container') private chartContainer!: HTMLDivElement;

  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 400px;
    }

    .chart-container {
      width: 100%;
      height: 100%;
    }
  `;

  protected render() {
    return html`<div class="chart-container"></div>`;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.initChart();
    this.setupResizeObserver();
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('config') && this.config) {
      this.updateChart();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.chart?.dispose();
    this.resizeObserver?.disconnect();
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    this.chart = echarts.init(this.chartContainer, undefined, {
      renderer: 'canvas',
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer);
  }

  private updateChart(): void {
    if (!this.chart || !this.config) return;

    const option = this.buildChartOption(this.config);
    this.chart.setOption(option, { notMerge: true });
  }

  private buildChartOption(config: ChartConfig): EChartsOption {
    const { series, axes, title, showLegend = true, showTooltip = true } = config;

    // Build y-axes
    const yAxis = axes.map((axis, index) => ({
      type: 'value' as const,
      name: axis.name || axis.unit,
      position: axis.position,
      axisLine: { show: true },
      axisLabel: {
        formatter: (value: number) => `${value}${axis.unit ? ` ${axis.unit}` : ''}`,
      },
      offset: index > 1 ? (index - 1) * 60 : 0,
    }));

    // Build series
    const chartSeries = series.map((s) => {
      const axisConfig = axes.find((a) => a.entityIds.includes(s.entityId));
      const axisIndex = axes.indexOf(axisConfig!);

      return {
        name: s.name,
        type: axisConfig?.chartType === 'area' ? 'line' : axisConfig?.chartType || 'line',
        yAxisIndex: axisIndex,
        data: s.dataPoints.map((p) => [p.timestamp, p.value]),
        smooth: true,
        areaStyle: axisConfig?.chartType === 'area' ? {} : undefined,
        stack: axisConfig?.stacked ? axisConfig.id : undefined,
      };
    });

    return {
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: showTooltip ? {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      } : undefined,
      legend: showLegend ? {
        data: series.map((s) => s.name),
        bottom: 0,
      } : undefined,
      grid: {
        left: '3%',
        right: axes.length > 1 ? '10%' : '3%',
        bottom: showLegend ? '15%' : '3%',
        top: title ? '15%' : '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          },
        },
      },
      yAxis,
      series: chartSeries,
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: showLegend ? '8%' : '3%' },
      ],
    };
  }

  /**
   * Export chart as image (for future use).
   */
  public exportAsImage(): string | undefined {
    return this.chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/components/chart-canvas.test.ts`
Expected: PASS - All tests pass

**Step 6: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add ChartCanvas ECharts wrapper component"
```

---

### Task 7: Create Entity Picker Component

**Files:**
- Create: `frontend/src/components/entity-picker.ts`
- Create: `frontend/src/components/entity-picker.test.ts`

**Step 1: Write the failing test**

Create `frontend/src/components/entity-picker.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './entity-picker';
import type { EntityPicker } from './entity-picker';

describe('EntityPicker', () => {
  const mockEntities = [
    { entity_id: 'sensor.power', name: 'Power Usage', area_id: 'living_room' },
    { entity_id: 'sensor.temp', name: 'Temperature', area_id: 'living_room' },
    { entity_id: 'sensor.humidity', name: 'Humidity', area_id: 'bedroom' },
  ];

  const mockAreas = [
    { area_id: 'living_room', name: 'Living Room' },
    { area_id: 'bedroom', name: 'Bedroom' },
  ];

  it('should render search input', async () => {
    const el = await fixture<EntityPicker>(
      html`<entity-picker .entities=${mockEntities} .areas=${mockAreas}></entity-picker>`
    );
    const input = el.shadowRoot?.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('should filter entities by search term', async () => {
    const el = await fixture<EntityPicker>(
      html`<entity-picker .entities=${mockEntities} .areas=${mockAreas}></entity-picker>`
    );

    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    input.value = 'power';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    const items = el.shadowRoot?.querySelectorAll('.entity-item');
    expect(items?.length).toBe(1);
  });

  it('should emit entity-selected event when entity is clicked', async () => {
    const el = await fixture<EntityPicker>(
      html`<entity-picker .entities=${mockEntities} .areas=${mockAreas}></entity-picker>`
    );

    const handler = vi.fn();
    el.addEventListener('entity-selected', handler);

    const firstItem = el.shadowRoot?.querySelector('.entity-item') as HTMLElement;
    firstItem?.click();

    expect(handler).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/components/entity-picker.test.ts`
Expected: FAIL - Cannot find module './entity-picker'

**Step 3: Write minimal implementation**

Create `frontend/src/components/entity-picker.ts`:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import Fuse from 'fuse.js';
import type { HassEntityRegistry, HassArea } from '../types/homeassistant';

interface GroupedEntities {
  areaName: string;
  areaId: string | null;
  entities: HassEntityRegistry[];
}

@customElement('entity-picker')
export class EntityPicker extends LitElement {
  @property({ type: Array }) entities: HassEntityRegistry[] = [];
  @property({ type: Array }) areas: HassArea[] = [];
  @property({ type: Array }) selectedEntityIds: string[] = [];

  @state() private searchTerm = '';
  @state() private expandedAreas: Set<string> = new Set();

  private fuse?: Fuse<HassEntityRegistry>;

  static styles = css`
    :host {
      display: block;
      max-height: 400px;
      overflow-y: auto;
    }

    .search-container {
      position: sticky;
      top: 0;
      background: var(--card-background-color, #fff);
      padding: 8px;
      z-index: 1;
    }

    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      background: var(--primary-background-color, #fff);
      color: var(--primary-text-color, #000);
    }

    .area-group {
      margin-bottom: 8px;
    }

    .area-header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      font-weight: 500;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
    }

    .area-header:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .entity-list {
      padding-left: 16px;
    }

    .entity-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
    }

    .entity-item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .entity-item.selected {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }

    .entity-name {
      font-size: 14px;
    }

    .entity-id {
      font-size: 12px;
      color: var(--secondary-text-color, #666);
    }

    .entity-item.selected .entity-id {
      color: var(--text-primary-color, #fff);
      opacity: 0.8;
    }

    .add-btn {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .unit {
      font-size: 11px;
      color: var(--secondary-text-color, #666);
      margin-left: 8px;
    }
  `;

  protected updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('entities') && this.entities.length > 0) {
      this.initFuse();
    }
  }

  private initFuse(): void {
    this.fuse = new Fuse(this.entities, {
      keys: ['entity_id', 'name', 'original_name'],
      threshold: 0.3,
    });
  }

  protected render() {
    const filteredEntities = this.getFilteredEntities();
    const grouped = this.groupByArea(filteredEntities);

    return html`
      <div class="search-container">
        <input
          type="text"
          placeholder="Search entities..."
          .value=${this.searchTerm}
          @input=${this.handleSearch}
        />
      </div>
      <div class="entity-groups">
        ${grouped.map((group) => this.renderAreaGroup(group))}
      </div>
    `;
  }

  private renderAreaGroup(group: GroupedEntities) {
    const isExpanded = this.expandedAreas.has(group.areaId || 'no-area') || this.searchTerm.length > 0;

    return html`
      <div class="area-group">
        <div class="area-header" @click=${() => this.toggleArea(group.areaId)}>
          ${isExpanded ? '▼' : '▶'} ${group.areaName} (${group.entities.length})
        </div>
        ${isExpanded ? html`
          <div class="entity-list">
            ${group.entities.map((entity) => this.renderEntity(entity))}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderEntity(entity: HassEntityRegistry) {
    const isSelected = this.selectedEntityIds.includes(entity.entity_id);
    const name = entity.name || entity.original_name || entity.entity_id;

    return html`
      <div
        class="entity-item ${isSelected ? 'selected' : ''}"
        @click=${() => this.selectEntity(entity)}
      >
        <div>
          <div class="entity-name">${name}</div>
          <div class="entity-id">${entity.entity_id}</div>
        </div>
        ${!isSelected ? html`<button class="add-btn">+ Add</button>` : ''}
      </div>
    `;
  }

  private getFilteredEntities(): HassEntityRegistry[] {
    if (!this.searchTerm || !this.fuse) {
      return this.entities.filter((e) => e.entity_id.startsWith('sensor.'));
    }
    return this.fuse.search(this.searchTerm).map((r) => r.item);
  }

  private groupByArea(entities: HassEntityRegistry[]): GroupedEntities[] {
    const areaMap = new Map<string | null, HassEntityRegistry[]>();

    for (const entity of entities) {
      const key = entity.area_id;
      if (!areaMap.has(key)) {
        areaMap.set(key, []);
      }
      areaMap.get(key)!.push(entity);
    }

    return Array.from(areaMap.entries())
      .map(([areaId, entities]) => ({
        areaId,
        areaName: this.areas.find((a) => a.area_id === areaId)?.name || 'No Area',
        entities: entities.sort((a, b) =>
          (a.name || a.entity_id).localeCompare(b.name || b.entity_id)
        ),
      }))
      .sort((a, b) => a.areaName.localeCompare(b.areaName));
  }

  private handleSearch(e: Event): void {
    this.searchTerm = (e.target as HTMLInputElement).value;
  }

  private toggleArea(areaId: string | null): void {
    const key = areaId || 'no-area';
    if (this.expandedAreas.has(key)) {
      this.expandedAreas.delete(key);
    } else {
      this.expandedAreas.add(key);
    }
    this.requestUpdate();
  }

  private selectEntity(entity: HassEntityRegistry): void {
    this.dispatchEvent(new CustomEvent('entity-selected', {
      detail: { entity },
      bubbles: true,
      composed: true,
    }));
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/components/entity-picker.test.ts`
Expected: PASS - All tests pass

**Step 5: Commit**

```bash
git add frontend/src/components/entity-picker.ts frontend/src/components/entity-picker.test.ts
git commit -m "feat: add EntityPicker component with fuzzy search and area grouping"
```

---

### Task 8: Create Natural Language Query Parser

**Files:**
- Create: `frontend/src/query/parser.ts`
- Create: `frontend/src/query/parser.test.ts`

**Step 1: Write the failing tests**

Create `frontend/src/query/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { QueryParser, type ParsedQuery } from './parser';
import type { HassEntityRegistry } from '../types/homeassistant';

describe('QueryParser', () => {
  const mockEntities: HassEntityRegistry[] = [
    { entity_id: 'sensor.power_usage', name: 'Power Usage' } as HassEntityRegistry,
    { entity_id: 'sensor.energy_cost', name: 'Energy Cost' } as HassEntityRegistry,
    { entity_id: 'sensor.temperature', name: 'Temperature' } as HassEntityRegistry,
    { entity_id: 'sensor.humidity', name: 'Humidity' } as HassEntityRegistry,
    { entity_id: 'sensor.grid_power', name: 'Grid Power' } as HassEntityRegistry,
    { entity_id: 'sensor.solar_power', name: 'Solar Power' } as HassEntityRegistry,
  ];

  let parser: QueryParser;

  beforeEach(() => {
    parser = new QueryParser(mockEntities);
  });

  describe('parseTimeRange', () => {
    it('should parse "last 7 days"', () => {
      const result = parser.parse('show me power usage last 7 days');
      expect(result.timeRange.preset).toBe('7d');
    });

    it('should parse "last week"', () => {
      const result = parser.parse('temperature last week');
      expect(result.timeRange.preset).toBe('7d');
    });

    it('should parse "past 30 days"', () => {
      const result = parser.parse('energy cost past 30 days');
      expect(result.timeRange.preset).toBe('30d');
    });

    it('should parse "yesterday"', () => {
      const result = parser.parse('power usage yesterday');
      expect(result.timeRange.preset).toBe('1d');
    });

    it('should parse "this month"', () => {
      const result = parser.parse('cost this month');
      expect(result.timeRange.preset).toBe('30d');
    });
  });

  describe('parseEntities', () => {
    it('should match entity by friendly name', () => {
      const result = parser.parse('show me power usage');
      expect(result.entities).toContain('sensor.power_usage');
    });

    it('should match multiple entities', () => {
      const result = parser.parse('temperature and humidity');
      expect(result.entities).toContain('sensor.temperature');
      expect(result.entities).toContain('sensor.humidity');
    });

    it('should handle "vs" comparison syntax', () => {
      const result = parser.parse('power usage vs cost');
      expect(result.entities.length).toBeGreaterThanOrEqual(2);
      expect(result.comparison).toBe(true);
    });
  });

  describe('parseChartType', () => {
    it('should detect "bar chart"', () => {
      const result = parser.parse('power usage as bar chart');
      expect(result.chartType).toBe('bar');
    });

    it('should detect "stacked"', () => {
      const result = parser.parse('stack grid and solar power');
      expect(result.stacked).toBe(true);
    });

    it('should detect "pie"', () => {
      const result = parser.parse('show pie chart of power usage');
      expect(result.chartType).toBe('pie');
    });
  });

  describe('parseAggregation', () => {
    it('should detect "daily"', () => {
      const result = parser.parse('daily power usage');
      expect(result.aggregation).toBe('day');
    });

    it('should detect "hourly"', () => {
      const result = parser.parse('hourly temperature');
      expect(result.aggregation).toBe('hour');
    });
  });

  describe('full queries', () => {
    it('should parse "electricity cost last month"', () => {
      const result = parser.parse('electricity cost last month');
      expect(result.entities).toContain('sensor.energy_cost');
      expect(result.timeRange.preset).toBe('30d');
    });

    it('should parse "temperature vs humidity this week"', () => {
      const result = parser.parse('temperature vs humidity this week');
      expect(result.entities).toContain('sensor.temperature');
      expect(result.entities).toContain('sensor.humidity');
      expect(result.comparison).toBe(true);
      expect(result.timeRange.preset).toBe('7d');
    });

    it('should parse "daily power usage as bar chart"', () => {
      const result = parser.parse('daily power usage as bar chart');
      expect(result.entities).toContain('sensor.power_usage');
      expect(result.chartType).toBe('bar');
      expect(result.aggregation).toBe('day');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/query/parser.test.ts`
Expected: FAIL - Cannot find module './parser'

**Step 3: Create query directory and parser.ts**

```bash
mkdir -p frontend/src/query
```

Create `frontend/src/query/parser.ts`:

```typescript
import Fuse from 'fuse.js';
import type { HassEntityRegistry } from '../types/homeassistant';

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter';
export type Aggregation = 'hour' | 'day' | 'week' | 'month';

export interface TimeRange {
  preset?: string;
  start?: Date;
  end?: Date;
}

export interface ParsedQuery {
  entities: string[];
  timeRange: TimeRange;
  chartType?: ChartType;
  aggregation?: Aggregation;
  stacked?: boolean;
  comparison?: boolean;
  rawQuery: string;
}

const TIME_PATTERNS: Array<{ pattern: RegExp; preset: string }> = [
  { pattern: /last\s+(\d+)\s+days?/i, preset: '$1d' },
  { pattern: /past\s+(\d+)\s+days?/i, preset: '$1d' },
  { pattern: /last\s+(\d+)\s+hours?/i, preset: '$1h' },
  { pattern: /last\s+week/i, preset: '7d' },
  { pattern: /this\s+week/i, preset: '7d' },
  { pattern: /last\s+month/i, preset: '30d' },
  { pattern: /this\s+month/i, preset: '30d' },
  { pattern: /yesterday/i, preset: '1d' },
  { pattern: /today/i, preset: '24h' },
  { pattern: /last\s+24\s+hours?/i, preset: '24h' },
];

const CHART_TYPE_PATTERNS: Array<{ pattern: RegExp; type: ChartType }> = [
  { pattern: /bar\s+chart|as\s+bar/i, type: 'bar' },
  { pattern: /line\s+chart|as\s+line/i, type: 'line' },
  { pattern: /area\s+chart|as\s+area/i, type: 'area' },
  { pattern: /pie\s+chart|as\s+pie/i, type: 'pie' },
  { pattern: /scatter|correlation/i, type: 'scatter' },
];

const AGGREGATION_PATTERNS: Array<{ pattern: RegExp; agg: Aggregation }> = [
  { pattern: /hourly|per\s+hour/i, agg: 'hour' },
  { pattern: /daily|per\s+day/i, agg: 'day' },
  { pattern: /weekly|per\s+week/i, agg: 'week' },
  { pattern: /monthly|per\s+month/i, agg: 'month' },
];

export class QueryParser {
  private fuse: Fuse<HassEntityRegistry>;
  private entities: HassEntityRegistry[];

  constructor(entities: HassEntityRegistry[]) {
    this.entities = entities;
    this.fuse = new Fuse(entities, {
      keys: [
        { name: 'entity_id', weight: 0.3 },
        { name: 'name', weight: 0.5 },
        { name: 'original_name', weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }

  parse(query: string): ParsedQuery {
    const result: ParsedQuery = {
      entities: [],
      timeRange: { preset: '24h' }, // Default to 24 hours
      rawQuery: query,
    };

    // Parse time range
    result.timeRange = this.parseTimeRange(query);

    // Parse chart type
    result.chartType = this.parseChartType(query);

    // Parse aggregation
    result.aggregation = this.parseAggregation(query);

    // Parse stacked
    result.stacked = /stack(ed)?/i.test(query);

    // Parse comparison
    result.comparison = /\s+vs\.?\s+|\s+versus\s+|\s+compared\s+to\s+|\s+against\s+/i.test(query);

    // Parse entities
    result.entities = this.parseEntities(query);

    return result;
  }

  private parseTimeRange(query: string): TimeRange {
    for (const { pattern, preset } of TIME_PATTERNS) {
      const match = query.match(pattern);
      if (match) {
        // Handle dynamic patterns like "last 7 days"
        if (preset.includes('$1') && match[1]) {
          return { preset: preset.replace('$1', match[1]) };
        }
        return { preset };
      }
    }
    return { preset: '24h' };
  }

  private parseChartType(query: string): ChartType | undefined {
    for (const { pattern, type } of CHART_TYPE_PATTERNS) {
      if (pattern.test(query)) {
        return type;
      }
    }
    return undefined;
  }

  private parseAggregation(query: string): Aggregation | undefined {
    for (const { pattern, agg } of AGGREGATION_PATTERNS) {
      if (pattern.test(query)) {
        return agg;
      }
    }
    return undefined;
  }

  private parseEntities(query: string): string[] {
    // Remove time expressions and chart modifiers to focus on entity matching
    let cleanedQuery = query
      .replace(/last\s+\d+\s+\w+/gi, '')
      .replace(/past\s+\d+\s+\w+/gi, '')
      .replace(/this\s+\w+/gi, '')
      .replace(/yesterday|today/gi, '')
      .replace(/as\s+\w+\s+chart/gi, '')
      .replace(/\b(bar|line|area|pie|scatter)\s+chart\b/gi, '')
      .replace(/\b(hourly|daily|weekly|monthly)\b/gi, '')
      .replace(/\b(stacked?|show|me|the|and|or)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split on comparison operators
    const parts = cleanedQuery.split(/\s+vs\.?\s+|\s+versus\s+|\s+compared\s+to\s+|\s+against\s+/i);

    const foundEntities: string[] = [];

    for (const part of parts) {
      const searchTerms = part.split(/\s+and\s+/i);

      for (const term of searchTerms) {
        const trimmed = term.trim();
        if (trimmed.length < 2) continue;

        const results = this.fuse.search(trimmed);
        if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
          const entityId = results[0].item.entity_id;
          if (!foundEntities.includes(entityId)) {
            foundEntities.push(entityId);
          }
        }
      }
    }

    return foundEntities;
  }

  /**
   * Convert preset string to actual date range.
   */
  static presetToDateRange(preset: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    const match = preset.match(/^(\d+)(h|d|w|m)$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 'h':
          start.setHours(start.getHours() - value);
          break;
        case 'd':
          start.setDate(start.getDate() - value);
          break;
        case 'w':
          start.setDate(start.getDate() - value * 7);
          break;
        case 'm':
          start.setMonth(start.getMonth() - value);
          break;
      }
    }

    return { start, end };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/query/parser.test.ts`
Expected: PASS - All tests pass

**Step 5: Commit**

```bash
git add frontend/src/query/
git commit -m "feat: add natural language query parser with entity matching"
```

---

## Phase 4: Storage Layer

### Task 9: Create Chart Storage Service

**Files:**
- Create: `frontend/src/storage/chart-storage.ts`
- Create: `frontend/src/storage/chart-storage.test.ts`

**Step 1: Write the failing test**

Create `frontend/src/storage/chart-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
        entities: [{ entityId: 'sensor.power', axisId: 'left' }],
        chartTypes: [{ axisId: 'left', type: 'line' }],
        timeRange: { preset: '7d' },
        axes: [{ id: 'left', position: 'left', entityIds: ['sensor.power'] }],
      };

      const saved = storage.save(chart);

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Test Chart');
      expect(saved.createdAt).toBeDefined();
    });

    it('should update an existing chart', () => {
      const chart = storage.save({
        name: 'Original',
        entities: [],
        chartTypes: [],
        timeRange: { preset: '7d' },
        axes: [],
      });

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
      storage.save({ name: 'Chart 1', entities: [], chartTypes: [], timeRange: { preset: '7d' }, axes: [] });
      storage.save({ name: 'Chart 2', entities: [], chartTypes: [], timeRange: { preset: '7d' }, axes: [] });

      const all = storage.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should return a chart by id', () => {
      const saved = storage.save({
        name: 'Test',
        entities: [],
        chartTypes: [],
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
        chartTypes: [],
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
        entities: [{ entityId: 'sensor.power', axisId: 'left' }],
        chartTypes: [],
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
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/storage/chart-storage.test.ts`
Expected: FAIL - Cannot find module './chart-storage'

**Step 3: Create storage directory and chart-storage.ts**

```bash
mkdir -p frontend/src/storage
```

Create `frontend/src/storage/chart-storage.ts`:

```typescript
export interface EntityConfig {
  entityId: string;
  axisId: string;
  color?: string;
}

export interface ChartTypeConfig {
  axisId: string;
  type: 'line' | 'bar' | 'area';
  stacked?: boolean;
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
  chartTypes: ChartTypeConfig[];
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
    return this.charts.find((c) => c.id === id);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.charts));
  }

  private generateId(): string {
    return `chart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/storage/chart-storage.test.ts`
Expected: PASS - All tests pass

**Step 5: Commit**

```bash
git add frontend/src/storage/
git commit -m "feat: add ChartStorage service with localStorage persistence"
```

---

## Phase 5: Integration

### Task 10: Create Chart Builder Component

**Files:**
- Create: `frontend/src/components/chart-builder.ts`

**Step 1: Create chart-builder.ts**

Create `frontend/src/components/chart-builder.ts`:

```typescript
import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, HassEntityRegistry, HassArea } from '../types/homeassistant';
import { HaApi } from '../services/ha-api';
import { DataFetcher, type EntityDataSeries } from '../services/data-fetcher';
import { QueryParser, type ParsedQuery } from '../query/parser';
import { ChartStorage, type SavedChart, type AxisConfig, type EntityConfig, type ChartTypeConfig } from '../storage/chart-storage';
import './entity-picker';
import './chart-canvas';
import type { ChartConfig } from './chart-canvas';

@customElement('chart-builder')
export class ChartBuilder extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: String }) public chartId?: string;

  @state() private entities: HassEntityRegistry[] = [];
  @state() private areas: HassArea[] = [];
  @state() private queryText = '';
  @state() private selectedEntities: EntityConfig[] = [];
  @state() private axes: AxisConfig[] = [
    { id: 'left', position: 'left', entityIds: [] },
  ];
  @state() private chartTypes: ChartTypeConfig[] = [
    { axisId: 'left', type: 'line' },
  ];
  @state() private timeRangePreset = '24h';
  @state() private chartTitle = '';
  @state() private chartData: EntityDataSeries[] = [];
  @state() private loading = false;
  @state() private showEntityPicker = false;

  private api!: HaApi;
  private dataFetcher!: DataFetcher;
  private queryParser!: QueryParser;
  private storage = new ChartStorage();

  static styles = css`
    :host {
      display: block;
    }

    .builder-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .query-bar {
      display: flex;
      gap: 8px;
    }

    .query-input {
      flex: 1;
      padding: 12px;
      font-size: 14px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
    }

    .go-btn {
      padding: 12px 24px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .chart-area {
      min-height: 400px;
      background: var(--card-background-color, #fff);
      border-radius: 8px;
      padding: 16px;
    }

    .config-panel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding: 16px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 8px;
    }

    .config-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .config-section h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }

    .entity-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .entity-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-radius: 16px;
      font-size: 12px;
    }

    .remove-btn {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0 4px;
    }

    select, input[type="text"] {
      padding: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
    }

    .add-btn {
      padding: 8px 16px;
      background: transparent;
      border: 1px dashed var(--divider-color, #e0e0e0);
      border-radius: 4px;
      cursor: pointer;
      color: var(--secondary-text-color, #666);
    }

    .add-btn:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .save-btn {
      padding: 8px 24px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .back-btn {
      padding: 8px 24px;
      background: transparent;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      cursor: pointer;
      color: var(--primary-text-color);
    }

    .entity-picker-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .entity-picker-content {
      background: var(--card-background-color, #fff);
      border-radius: 8px;
      padding: 16px;
      width: 400px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: var(--secondary-text-color, #666);
    }
  `;

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    this.api = new HaApi(this.hass);
    this.dataFetcher = new DataFetcher(this.api);

    // Load entity registry and areas
    const [entities, areas] = await Promise.all([
      this.api.getEntityRegistry(),
      this.api.getAreas(),
    ]);
    this.entities = entities;
    this.areas = areas;
    this.queryParser = new QueryParser(entities);

    // If editing existing chart, load it
    if (this.chartId) {
      this.loadChart(this.chartId);
    }
  }

  protected render() {
    return html`
      <div class="builder-container">
        <div class="query-bar">
          <input
            type="text"
            class="query-input"
            placeholder="Try: 'power usage vs cost last 7 days' or 'temperature this week'"
            .value=${this.queryText}
            @input=${(e: Event) => this.queryText = (e.target as HTMLInputElement).value}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.handleQuery()}
          />
          <button class="go-btn" @click=${this.handleQuery}>Go</button>
        </div>

        <div class="chart-area">
          ${this.loading
            ? html`<div class="loading">Loading data...</div>`
            : html`<chart-canvas .config=${this.buildChartConfig()}></chart-canvas>`
          }
        </div>

        <div class="config-panel">
          <div class="config-section">
            <h3>Entities</h3>
            <div class="entity-list">
              ${this.selectedEntities.map((e) => html`
                <span class="entity-chip">
                  ${this.getEntityName(e.entityId)}
                  <button class="remove-btn" @click=${() => this.removeEntity(e.entityId)}>×</button>
                </span>
              `)}
            </div>
            <button class="add-btn" @click=${() => this.showEntityPicker = true}>+ Add Entity</button>
          </div>

          <div class="config-section">
            <h3>Chart Type</h3>
            <select @change=${this.handleChartTypeChange}>
              <option value="line" ?selected=${this.chartTypes[0]?.type === 'line'}>Line</option>
              <option value="bar" ?selected=${this.chartTypes[0]?.type === 'bar'}>Bar</option>
              <option value="area" ?selected=${this.chartTypes[0]?.type === 'area'}>Area</option>
            </select>
          </div>

          <div class="config-section">
            <h3>Time Range</h3>
            <select .value=${this.timeRangePreset} @change=${this.handleTimeRangeChange}>
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div class="config-section">
            <h3>Title</h3>
            <input
              type="text"
              placeholder="Chart title (optional)"
              .value=${this.chartTitle}
              @input=${(e: Event) => this.chartTitle = (e.target as HTMLInputElement).value}
            />
          </div>
        </div>

        <div class="actions">
          <button class="back-btn" @click=${this.handleBack}>Back</button>
          <button class="save-btn" @click=${this.handleSave}>Save Chart</button>
        </div>
      </div>

      ${this.showEntityPicker ? this.renderEntityPickerModal() : ''}
    `;
  }

  private renderEntityPickerModal() {
    return html`
      <div class="entity-picker-modal" @click=${this.closeEntityPicker}>
        <div class="entity-picker-content" @click=${(e: Event) => e.stopPropagation()}>
          <entity-picker
            .entities=${this.entities}
            .areas=${this.areas}
            .selectedEntityIds=${this.selectedEntities.map((e) => e.entityId)}
            @entity-selected=${this.handleEntitySelected}
          ></entity-picker>
        </div>
      </div>
    `;
  }

  private async handleQuery(): Promise<void> {
    if (!this.queryText.trim()) return;

    const parsed = this.queryParser.parse(this.queryText);

    // Update state based on parsed query
    if (parsed.entities.length > 0) {
      this.selectedEntities = parsed.entities.map((entityId) => ({
        entityId,
        axisId: 'left',
      }));
      this.axes[0].entityIds = parsed.entities;
    }

    if (parsed.timeRange.preset) {
      this.timeRangePreset = parsed.timeRange.preset;
    }

    if (parsed.chartType) {
      this.chartTypes = [{ axisId: 'left', type: parsed.chartType as 'line' | 'bar' | 'area' }];
    }

    await this.fetchChartData();
  }

  private async fetchChartData(): Promise<void> {
    if (this.selectedEntities.length === 0) return;

    this.loading = true;

    const { start, end } = QueryParser.presetToDateRange(this.timeRangePreset);

    try {
      this.chartData = await this.dataFetcher.fetchMultiple(
        this.selectedEntities.map((e) => e.entityId),
        start,
        end
      );
    } finally {
      this.loading = false;
    }
  }

  private buildChartConfig(): ChartConfig {
    return {
      title: this.chartTitle || undefined,
      series: this.chartData,
      axes: this.axes.map((axis) => ({
        ...axis,
        chartType: this.chartTypes.find((ct) => ct.axisId === axis.id)?.type || 'line',
      })),
      showLegend: true,
      showTooltip: true,
    };
  }

  private handleEntitySelected(e: CustomEvent): void {
    const entity = e.detail.entity as HassEntityRegistry;
    if (!this.selectedEntities.find((se) => se.entityId === entity.entity_id)) {
      this.selectedEntities = [...this.selectedEntities, {
        entityId: entity.entity_id,
        axisId: 'left',
      }];
      this.axes[0].entityIds = this.selectedEntities.map((e) => e.entityId);
      this.fetchChartData();
    }
    this.showEntityPicker = false;
  }

  private removeEntity(entityId: string): void {
    this.selectedEntities = this.selectedEntities.filter((e) => e.entityId !== entityId);
    this.axes[0].entityIds = this.selectedEntities.map((e) => e.entityId);
    this.fetchChartData();
  }

  private handleChartTypeChange(e: Event): void {
    const type = (e.target as HTMLSelectElement).value as 'line' | 'bar' | 'area';
    this.chartTypes = [{ axisId: 'left', type }];
    this.requestUpdate();
  }

  private handleTimeRangeChange(e: Event): void {
    this.timeRangePreset = (e.target as HTMLSelectElement).value;
    this.fetchChartData();
  }

  private closeEntityPicker(): void {
    this.showEntityPicker = false;
  }

  private getEntityName(entityId: string): string {
    const entity = this.entities.find((e) => e.entity_id === entityId);
    return entity?.name || entity?.original_name || entityId;
  }

  private loadChart(id: string): void {
    const chart = this.storage.get(id);
    if (!chart) return;

    this.selectedEntities = chart.entities;
    this.axes = chart.axes;
    this.chartTypes = chart.chartTypes;
    this.timeRangePreset = chart.timeRange.preset || '24h';
    this.chartTitle = chart.title || '';
    this.queryText = chart.naturalQuery || '';

    this.fetchChartData();
  }

  private handleSave(): void {
    const chart = this.storage.save({
      id: this.chartId,
      name: this.chartTitle || `Chart ${new Date().toLocaleDateString()}`,
      entities: this.selectedEntities,
      chartTypes: this.chartTypes,
      timeRange: { preset: this.timeRangePreset },
      axes: this.axes,
      title: this.chartTitle,
      naturalQuery: this.queryText,
    });

    this.dispatchEvent(new CustomEvent('chart-saved', {
      detail: { chart },
      bubbles: true,
      composed: true,
    }));
  }

  private handleBack(): void {
    this.dispatchEvent(new CustomEvent('back', {
      bubbles: true,
      composed: true,
    }));
  }
}
```

**Step 2: Build and verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/components/chart-builder.ts
git commit -m "feat: add ChartBuilder component integrating all pieces"
```

---

### Task 11: Update Main Panel with Full Functionality

**Files:**
- Modify: `frontend/src/ha-data-visualizer.ts`

**Step 1: Update ha-data-visualizer.ts**

Update `frontend/src/ha-data-visualizer.ts` with full functionality:

```typescript
import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from './types/homeassistant';
import { ChartStorage, type SavedChart } from './storage/chart-storage';
import './components/chart-builder';

@customElement('ha-data-visualizer')
export class HaDataVisualizer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @property({ type: String }) public route = '';

  @state() private _view: 'list' | 'builder' = 'list';
  @state() private _editingChartId?: string;
  @state() private _savedCharts: SavedChart[] = [];

  private storage = new ChartStorage();

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
      color: var(--primary-text-color);
    }

    .container {
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
    }

    .new-chart-btn {
      background-color: var(--primary-color);
      color: var(--text-primary-color);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .new-chart-btn:hover {
      opacity: 0.9;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: var(--secondary-text-color);
    }

    .empty-state p {
      margin-bottom: 16px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .chart-card {
      background: var(--card-background-color, #fff);
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }

    .chart-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .chart-preview {
      height: 120px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color, #666);
    }

    .chart-name {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .chart-meta {
      font-size: 12px;
      color: var(--secondary-text-color, #666);
    }

    .chart-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .chart-actions button {
      flex: 1;
      padding: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      color: var(--primary-text-color);
    }

    .chart-actions button:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .chart-actions .delete-btn:hover {
      background: var(--error-color, #f44336);
      color: white;
      border-color: var(--error-color, #f44336);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadCharts();
  }

  private loadCharts(): void {
    this._savedCharts = this.storage.getAll();
  }

  protected render() {
    return html`
      <div class="container">
        ${this._view === 'list' ? this._renderChartList() : this._renderBuilder()}
      </div>
    `;
  }

  private _renderChartList() {
    return html`
      <div class="header">
        <h1>Data Visualizer</h1>
        <button class="new-chart-btn" @click=${this._handleNewChart}>
          + New Chart
        </button>
      </div>

      ${this._savedCharts.length === 0
        ? html`
          <div class="empty-state">
            <p>No saved charts yet.</p>
            <button class="new-chart-btn" @click=${this._handleNewChart}>
              Create your first chart
            </button>
          </div>
        `
        : html`
          <div class="charts-grid">
            ${this._savedCharts.map((chart) => this._renderChartCard(chart))}
          </div>
        `
      }
    `;
  }

  private _renderChartCard(chart: SavedChart) {
    const updatedDate = new Date(chart.updatedAt).toLocaleDateString();
    const entityCount = chart.entities.length;

    return html`
      <div class="chart-card" @click=${() => this._handleEditChart(chart.id)}>
        <div class="chart-preview">
          Preview
        </div>
        <div class="chart-name">${chart.name}</div>
        <div class="chart-meta">
          ${entityCount} ${entityCount === 1 ? 'entity' : 'entities'} • Updated ${updatedDate}
        </div>
        <div class="chart-actions" @click=${(e: Event) => e.stopPropagation()}>
          <button @click=${() => this._handleDuplicate(chart.id)}>Duplicate</button>
          <button class="delete-btn" @click=${() => this._handleDelete(chart.id)}>Delete</button>
        </div>
      </div>
    `;
  }

  private _renderBuilder() {
    return html`
      <chart-builder
        .hass=${this.hass}
        .chartId=${this._editingChartId}
        @chart-saved=${this._handleChartSaved}
        @back=${this._handleBackToList}
      ></chart-builder>
    `;
  }

  private _handleNewChart() {
    this._editingChartId = undefined;
    this._view = 'builder';
  }

  private _handleEditChart(id: string) {
    this._editingChartId = id;
    this._view = 'builder';
  }

  private _handleDuplicate(id: string) {
    this.storage.duplicate(id);
    this.loadCharts();
  }

  private _handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this chart?')) {
      this.storage.delete(id);
      this.loadCharts();
    }
  }

  private _handleChartSaved() {
    this.loadCharts();
    this._view = 'list';
  }

  private _handleBackToList() {
    this._view = 'list';
  }
}
```

**Step 2: Build and verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds, `custom_components/data_visualizer/frontend/ha-data-visualizer.js` created

**Step 3: Commit**

```bash
git add frontend/src/ha-data-visualizer.ts
git commit -m "feat: complete main panel with chart list and builder views"
```

---

### Task 12: Add HACS Configuration

**Files:**
- Create: `hacs.json`
- Create: `README.md` (minimal)

**Step 1: Create hacs.json**

Create `hacs.json` in project root:

```json
{
  "name": "Data Visualizer",
  "homeassistant": "2024.1.0",
  "render_readme": true,
  "zip_release": true,
  "filename": "ha-data-visualizer.js",
  "content_in_root": false
}
```

**Step 2: Create minimal README**

Create `README.md`:

```markdown
# HA Data Visualizer

A Home Assistant custom panel for on-demand data visualization.

## Features

- Sidebar panel integration
- Entity picker with search and area grouping
- Natural language queries ("power usage last 7 days")
- Multiple chart types (line, bar, area, pie, scatter)
- Multi-axis support
- Save and load charts

## Installation

### HACS (Recommended)

1. Open HACS
2. Go to Integrations
3. Click the three dots menu → Custom repositories
4. Add this repository URL
5. Install "Data Visualizer"
6. Restart Home Assistant

### Manual

1. Copy `custom_components/data_visualizer` to your `config/custom_components/` directory
2. Restart Home Assistant

## Usage

After installation, "Data Visualizer" will appear in your sidebar.

## Development

```bash
cd frontend
npm install
npm run dev    # Development mode
npm run build  # Build for production
npm run test   # Run tests
```
```

**Step 3: Commit**

```bash
git add hacs.json README.md
git commit -m "feat: add HACS configuration and README"
```

---

### Task 13: Final Build and Test

**Step 1: Run full test suite**

Run: `cd frontend && npm run test`
Expected: All tests pass

**Step 2: Run production build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Verify file structure**

Run: `find . -type f -name "*.py" -o -name "*.ts" -o -name "*.json" | grep -v node_modules | sort`
Expected: All expected files present

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final build verification"
```

---

## Summary

This plan creates a fully functional HA Data Visualizer with:

1. **HA Integration** - Registers sidebar panel
2. **Data Layer** - HaApi and DataFetcher with smart resolution
3. **Components** - EntityPicker, ChartCanvas (ECharts), ChartBuilder
4. **Query Parser** - Natural language to chart config
5. **Storage** - localStorage persistence
6. **HACS** - Ready for community distribution

Total: 13 tasks with TDD approach where applicable.
