import { describe, it, expect } from 'vitest';
import { assignAxes, type EntityWithUnit } from './axis-assignment';

describe('assignAxes', () => {
  it('should assign entities with same unit to same axis', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power1', unit: 'kWh' },
      { entityId: 'sensor.power2', unit: 'kWh' },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power1']).toBe('left');
    expect(result['sensor.power2']).toBe('left');
  });

  it('should assign different units to different axes', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power', unit: 'kWh' },
      { entityId: 'sensor.cost', unit: '£' },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power']).toBe('left');
    expect(result['sensor.cost']).toBe('right');
  });

  it('should assign first unit type to left axis', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.cost', unit: '£' },
      { entityId: 'sensor.power', unit: 'kWh' },
    ];

    const result = assignAxes(entities);

    // First encountered unit gets left
    expect(result['sensor.cost']).toBe('left');
    expect(result['sensor.power']).toBe('right');
  });

  it('should handle more than 2 unit types (third+ goes to right)', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power', unit: 'kWh' },
      { entityId: 'sensor.cost', unit: '£' },
      { entityId: 'sensor.temp', unit: '°C' },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power']).toBe('left');
    expect(result['sensor.cost']).toBe('right');
    expect(result['sensor.temp']).toBe('right');
  });

  it('should handle entities without units', () => {
    const entities: EntityWithUnit[] = [
      { entityId: 'sensor.power', unit: 'kWh' },
      { entityId: 'sensor.unknown', unit: undefined },
    ];

    const result = assignAxes(entities);

    expect(result['sensor.power']).toBe('left');
    expect(result['sensor.unknown']).toBe('right');
  });
});
