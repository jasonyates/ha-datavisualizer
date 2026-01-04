import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, HassEntityRegistry, HassArea, HassDevice } from '../types/homeassistant';
import { HaApi } from '../services/ha-api';
import { DataFetcher, type EntityDataSeries } from '../services/data-fetcher';
import { QueryParser } from '../query/parser';
import { ChartStorage, type EntityConfig, type LegendConfig } from '../storage/chart-storage';
import './entity-picker';
import './entity-config-card';
import './chart-canvas';
import type { ChartConfig, AxisInfo, SeriesConfig } from './chart-canvas';
import { assignAxes, getDefaultStatisticsType, getDefaultGroupingPeriod } from '../utils/axis-assignment';

@customElement('chart-builder')
export class ChartBuilder extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: String }) public chartId?: string;

  @state() private entities: HassEntityRegistry[] = [];
  @state() private areas: HassArea[] = [];
  @state() private devices: HassDevice[] = [];
  @state() private selectedEntities: EntityConfig[] = [];
  @state() private timeRangePreset = '24h';
  @state() private chartTitle = '';
  @state() private chartData: EntityDataSeries[] = [];
  @state() private loading = false;
  @state() private showEntityPicker = false;
  @state() private error = '';
  @state() private legendConfig: LegendConfig = {
    mode: 'list',
    showMin: false,
    showAvg: false,
    showMax: false,
    showCurrent: false,
  };

  private api!: HaApi;
  private dataFetcher!: DataFetcher;
  private storage!: ChartStorage;

  static styles = css`
    :host {
      display: block;
    }

    .builder-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--card-background-color, #fff);
      border-radius: 8px;
    }

    .header h2 {
      flex: 1;
      margin: 0;
      font-size: 18px;
    }

    .header .back-btn {
      padding: 8px 16px;
      background: transparent;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 4px;
      cursor: pointer;
      color: var(--primary-text-color);
    }

    .header .save-btn {
      padding: 8px 24px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .chart-area {
      min-height: 400px;
      background: var(--card-background-color, #fff);
      border-radius: 8px;
      padding: 16px;
    }

    .config-panel {
      display: grid;
      grid-template-columns: 40% 30% 30%;
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
      width: 600px;
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

    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: var(--error-color, #f44336);
    }

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

    .config-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  `;

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    this.api = new HaApi(this.hass);
    this.dataFetcher = new DataFetcher(this.api);
    this.storage = new ChartStorage(this.hass);

    try {
      const [entities, areas, devices] = await Promise.all([
        this.api.getEntityRegistry(),
        this.api.getAreas(),
        this.api.getDeviceRegistry(),
      ]);
      this.entities = entities;
      this.areas = areas;
      this.devices = devices;

      if (this.chartId) {
        await this.loadChart(this.chartId);
      }
    } catch (e) {
      console.error('Failed to load entities:', e);
      this.error = 'Failed to load entity data. Please refresh.';
    }
  }

  protected render() {
    return html`
      <div class="builder-container">
        <div class="header">
          <button class="back-btn" @click=${this.handleBack}>
            ← Back
          </button>
          <h2>${this.chartId ? 'Edit Chart' : 'New Chart'}</h2>
          <button class="save-btn" @click=${this.handleSave}>Save</button>
        </div>

        <div class="chart-area">
          ${this.error
            ? html`<div class="error">${this.error}</div>`
            : this.loading
              ? html`<div class="loading">Loading data...</div>`
              : html`<chart-canvas .config=${this.buildChartConfig()}></chart-canvas>`
          }
        </div>

        <div class="config-panel">
          <div class="config-section">
            <h3>Entities</h3>
            <div class="entity-list">
              ${this.selectedEntities.map((entity) => {
                const state = this.hass?.states[entity.entityId];
                const name = (state?.attributes?.friendly_name as string) || entity.entityId;
                const unit = (state?.attributes?.unit_of_measurement as string) || '';
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

          <div class="config-group">
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
                <input type="checkbox" .checked=${this.legendConfig.showMin}
                  @change=${(e: Event) => { this.legendConfig = { ...this.legendConfig, showMin: (e.target as HTMLInputElement).checked }; }} />
                Min
              </label>
              <label>
                <input type="checkbox" .checked=${this.legendConfig.showAvg}
                  @change=${(e: Event) => { this.legendConfig = { ...this.legendConfig, showAvg: (e.target as HTMLInputElement).checked }; }} />
                Avg
              </label>
              <label>
                <input type="checkbox" .checked=${this.legendConfig.showMax}
                  @change=${(e: Event) => { this.legendConfig = { ...this.legendConfig, showMax: (e.target as HTMLInputElement).checked }; }} />
                Max
              </label>
              <label>
                <input type="checkbox" .checked=${this.legendConfig.showCurrent}
                  @change=${(e: Event) => { this.legendConfig = { ...this.legendConfig, showCurrent: (e.target as HTMLInputElement).checked }; }} />
                Current
              </label>
            </div>
          </div>
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
            .devices=${this.devices}
            .selectedEntityIds=${this.selectedEntities.map((e) => e.entityId)}
            @entity-selected=${this.handleEntitySelected}
          ></entity-picker>
        </div>
      </div>
    `;
  }

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
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      this.error = 'Failed to load chart data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private buildChartConfig(): ChartConfig {
    // Build axes info from entities
    const unitToAxis = new Map<string, 'left' | 'right'>();
    const axesInfo: AxisInfo[] = [];

    for (const entity of this.selectedEntities) {
      const state = this.hass?.states[entity.entityId];
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

    const seriesConfig: SeriesConfig[] = this.selectedEntities.map((e) => ({
      entityId: e.entityId,
      chartType: e.chartType,
      axisId: e.axisId,
    }));

    return {
      title: this.chartTitle || undefined,
      series: this.chartData,
      seriesConfig,
      axes: axesInfo,
      showLegend: true,
      showTooltip: true,
      legendConfig: this.legendConfig,
    };
  }

  private handleEntitySelected(e: CustomEvent): void {
    const entity = e.detail.entity as HassEntityRegistry;
    const state = this.hass?.states[entity.entity_id];
    const unit = (state?.attributes?.unit_of_measurement as string) || undefined;

    if (!this.selectedEntities.find((se) => se.entityId === entity.entity_id)) {
      const newEntity: EntityConfig = {
        entityId: entity.entity_id,
        axisId: 'left', // Will be reassigned
        chartType: unit && ['kWh', 'Wh', 'MWh', 'm³'].includes(unit) ? 'bar' : 'line',
        statisticsType: getDefaultStatisticsType(unit),
        groupingPeriod: getDefaultGroupingPeriod(unit),
      };

      const updatedEntities = [...this.selectedEntities, newEntity];
      this._reassignAxes(updatedEntities);
      this.fetchChartData();
    }
    this.showEntityPicker = false;
  }

  private _reassignAxes(entities: EntityConfig[]): void {
    const entitiesWithUnits = entities.map((e) => ({
      entityId: e.entityId,
      unit: (this.hass?.states[e.entityId]?.attributes?.unit_of_measurement as string) || undefined,
    }));
    const axisAssignments = assignAxes(entitiesWithUnits);
    this.selectedEntities = entities.map((e) => ({
      ...e,
      axisId: axisAssignments[e.entityId],
    }));
  }

  private _handleEntityRemove(e: CustomEvent): void {
    const entityId = e.detail.entityId;
    const updatedEntities = this.selectedEntities.filter((e) => e.entityId !== entityId);
    this._reassignAxes(updatedEntities);
    this.fetchChartData();
  }

  private _handleEntityConfigChange(e: CustomEvent): void {
    const { entityId, changes } = e.detail;
    this.selectedEntities = this.selectedEntities.map((entity) =>
      entity.entityId === entityId ? { ...entity, ...changes } : entity
    );
    this.fetchChartData();
  }

  private handleTimeRangeChange(e: Event): void {
    this.timeRangePreset = (e.target as HTMLSelectElement).value;
    this.fetchChartData();
  }

  private closeEntityPicker(): void {
    this.showEntityPicker = false;
  }

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

  private async handleSave(): Promise<void> {
    // Build axes from entities for storage compatibility
    const axesMap = new Map<string, { id: 'left' | 'right', entityIds: string[], unit?: string }>();

    for (const entity of this.selectedEntities) {
      const state = this.hass?.states[entity.entityId];
      const unit = (state?.attributes?.unit_of_measurement as string) || '';
      const axisId = entity.axisId;

      if (!axesMap.has(axisId)) {
        axesMap.set(axisId, {
          id: axisId,
          entityIds: [],
          unit,
        });
      }
      axesMap.get(axisId)!.entityIds.push(entity.entityId);
    }

    const axes = Array.from(axesMap.values()).map(axis => ({
      id: axis.id,
      position: axis.id as 'left' | 'right',
      entityIds: axis.entityIds,
      unit: axis.unit,
    }));

    const chart = await this.storage.save({
      id: this.chartId,
      name: this.chartTitle || `Chart ${new Date().toLocaleDateString()}`,
      entities: this.selectedEntities,
      axes,
      timeRange: { preset: this.timeRangePreset },
      title: this.chartTitle,
      legendConfig: this.legendConfig,
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
