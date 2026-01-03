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

    // Expand area first
    const areaHeader = el.shadowRoot?.querySelector('.area-header') as HTMLElement;
    areaHeader?.click();
    await el.updateComplete;

    const firstItem = el.shadowRoot?.querySelector('.entity-item') as HTMLElement;
    firstItem?.click();

    expect(handler).toHaveBeenCalled();
  });
});
