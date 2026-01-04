import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import Fuse from 'fuse.js';
import type { HassEntityRegistry, HassArea, HassDevice } from '../types/homeassistant';

interface GroupedEntities {
  areaName: string;
  areaId: string | null;
  entities: HassEntityRegistry[];
}

@customElement('entity-picker')
export class EntityPicker extends LitElement {
  @property({ type: Array }) entities: HassEntityRegistry[] = [];
  @property({ type: Array }) areas: HassArea[] = [];
  @property({ type: Array }) devices: HassDevice[] = [];
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

  private getEntityAreaId(entity: HassEntityRegistry): string | null {
    // First check if entity has a direct area assignment
    if (entity.area_id) {
      return entity.area_id;
    }
    // If not, check if the entity's device has an area
    if (entity.device_id) {
      const device = this.devices.find((d) => d.id === entity.device_id);
      if (device?.area_id) {
        return device.area_id;
      }
    }
    return null;
  }

  private groupByArea(entities: HassEntityRegistry[]): GroupedEntities[] {
    const areaMap = new Map<string | null, HassEntityRegistry[]>();

    for (const entity of entities) {
      const areaId = this.getEntityAreaId(entity);
      if (!areaMap.has(areaId)) {
        areaMap.set(areaId, []);
      }
      areaMap.get(areaId)!.push(entity);
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
