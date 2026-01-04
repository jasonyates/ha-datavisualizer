export interface EntityWithUnit {
  entityId: string;
  unit: string | undefined;
}

export type AxisId = 'left' | 'right';

/**
 * Automatically assign entities to Y-axes based on their units.
 * First unit type goes to left axis, second to right axis.
 * Entities with same unit share an axis.
 */
export function assignAxes(entities: EntityWithUnit[]): Record<string, AxisId> {
  const result: Record<string, AxisId> = {};
  const unitToAxis: Record<string, AxisId> = {};
  let axisCount = 0;

  for (const entity of entities) {
    const unit = entity.unit ?? '__no_unit__';

    if (!(unit in unitToAxis)) {
      // Assign new unit to next available axis
      unitToAxis[unit] = axisCount === 0 ? 'left' : 'right';
      axisCount++;
    }

    result[entity.entityId] = unitToAxis[unit];
  }

  return result;
}

/**
 * Get default statistics type based on unit.
 * Energy units default to 'change', others to 'mean'.
 */
export function getDefaultStatisticsType(unit: string | undefined): 'change' | 'mean' {
  const energyUnits = ['kWh', 'Wh', 'MWh', 'm³', 'ft³', 'gal', 'L'];
  if (unit && energyUnits.includes(unit)) {
    return 'change';
  }
  return 'mean';
}

/**
 * Get default grouping period based on unit.
 * Energy units default to 'day', others to 'hour'.
 */
export function getDefaultGroupingPeriod(unit: string | undefined): 'day' | 'hour' {
  const energyUnits = ['kWh', 'Wh', 'MWh', 'm³', 'ft³', 'gal', 'L'];
  if (unit && energyUnits.includes(unit)) {
    return 'day';
  }
  return 'hour';
}
