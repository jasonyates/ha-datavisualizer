export interface DataPoint {
  timestamp: number;
  value: number;
}

/**
 * Calculate the change (delta) between consecutive data points.
 * Used for energy sensors to show daily usage instead of cumulative totals.
 */
export function calculateChange(data: DataPoint[]): DataPoint[] {
  if (data.length < 2) return [];

  const result: DataPoint[] = [];
  for (let i = 1; i < data.length; i++) {
    result.push({
      timestamp: data[i].timestamp,
      value: data[i].value - data[i - 1].value,
    });
  }
  return result;
}

/**
 * Extract a specific statistic type from raw statistics data.
 */
export type StatisticsType = 'state' | 'mean' | 'min' | 'max' | 'sum' | 'change';
export type GroupingPeriod = 'hour' | 'day' | 'week' | 'month';
