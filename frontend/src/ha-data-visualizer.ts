import { LitElement, html, css } from 'lit';
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
  @state() private _error = '';

  private storage!: ChartStorage;

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

    .error-banner {
      background: var(--error-color, #f44336);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.storage = new ChartStorage(this.hass);
    this.loadCharts();
    this.checkUrlForChart();
  }

  private checkUrlForChart(): void {
    const url = new URL(window.location.href);
    const chartId = url.searchParams.get('chart');
    if (chartId) {
      this._handleEditChart(chartId);
    }
  }

  private async loadCharts(): Promise<void> {
    this._savedCharts = await this.storage.getAll();
  }

  protected render() {
    return html`
      <div class="container">
        ${this._error ? html`<div class="error-banner">${this._error}</div>` : ''}
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
    this._updateUrl();
  }

  private _handleEditChart(id: string) {
    this._editingChartId = id;
    this._view = 'builder';
    this._updateUrl(id);
  }

  private _updateUrl(chartId?: string): void {
    const url = new URL(window.location.href);
    if (chartId) {
      url.searchParams.set('chart', chartId);
    } else {
      url.searchParams.delete('chart');
    }
    history.replaceState({}, '', url.toString());
  }

  private async _handleDuplicate(id: string): Promise<void> {
    try {
      await this.storage.duplicate(id);
      await this.loadCharts();
    } catch (e) {
      console.error('Failed to duplicate chart:', e);
      this._error = 'Failed to duplicate chart.';
    }
  }

  private async _handleDelete(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this chart?')) {
      try {
        await this.storage.delete(id);
        await this.loadCharts();
      } catch (e) {
        console.error('Failed to delete chart:', e);
        this._error = 'Failed to delete chart.';
      }
    }
  }

  private _handleChartSaved() {
    this.loadCharts();
    this._view = 'list';
    this._updateUrl();
  }

  private _handleBackToList() {
    this._view = 'list';
    this._updateUrl();
  }
}
