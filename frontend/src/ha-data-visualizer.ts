import { LitElement, html, css } from 'lit';
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
