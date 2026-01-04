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
  @property({ attribute: false }) config?: EntityCardConfig;

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
      background: var(--primary-color, #03a9f4);
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
    if (!this.config) return html``;

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
              <option value="state">Last Value</option>
              <option value="mean">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
              <option value="sum">Total</option>
              <option value="change">Delta</option>
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
    if (!this.config) return;

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
    if (!this.config) return;

    this.dispatchEvent(new CustomEvent('config-change', {
      detail: { entityId: this.config.entityId, changes },
      bubbles: true,
      composed: true,
    }));
  }
}
