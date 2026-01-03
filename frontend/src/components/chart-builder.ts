import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, HassEntityRegistry, HassArea } from '../types/homeassistant';
import { HaApi } from '../services/ha-api';
import { DataFetcher, type EntityDataSeries } from '../services/data-fetcher';
import { QueryParser } from '../query/parser';
import { ChartStorage, type AxisConfig, type EntityConfig, type ChartTypeConfig } from '../storage/chart-storage';
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
