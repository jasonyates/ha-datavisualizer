import type { HaApi } from './ha-api';
import { calculateChange, type StatisticsType, type GroupingPeriod } from '../utils/statistics';

export interface ChartDataPoint {
  timestamp: number;
  value: number;
}

export interface EntityDataSeries {
  entityId: string;
  name: string;
  unit: string;
  dataPoints: ChartDataPoint[];
}

export interface FetchOptions {
  statisticsType: StatisticsType;
  groupingPeriod: GroupingPeriod;
}

export class DataFetcher {
  constructor(private api: HaApi) {}

  /**
   * Fetch data for an entity with specified statistics type and grouping.
   */
  async fetchData(
    entityId: string,
    start: Date,
    end: Date,
    options: FetchOptions
  ): Promise<EntityDataSeries> {
    const state = this.api.getState(entityId);
    const unit = (state?.attributes?.unit_of_measurement as string) || '';
    const name = (state?.attributes?.friendly_name as string) || entityId;

    // Map grouping period to HA API period
    const period = this.mapGroupingPeriod(options.groupingPeriod);

    // Fetch statistics
    const stats = await this.api.getStatistics(entityId, start, end, period);

    // Extract data points based on statistics type
    let dataPoints = this.extractDataPoints(stats, options.statisticsType);

    // For 'change' type, calculate deltas
    if (options.statisticsType === 'change') {
      dataPoints = calculateChange(dataPoints);
    }

    return {
      entityId,
      name,
      unit,
      dataPoints,
    };
  }

  /**
   * Fetch data for multiple entities with individual options.
   */
  async fetchMultiple(
    entities: Array<{ entityId: string; options: FetchOptions }>,
    start: Date,
    end: Date
  ): Promise<EntityDataSeries[]> {
    return Promise.all(
      entities.map(({ entityId, options }) =>
        this.fetchData(entityId, start, end, options)
      )
    );
  }

  private mapGroupingPeriod(period: GroupingPeriod): '5minute' | 'hour' | 'day' | 'week' | 'month' {
    switch (period) {
      case 'hour': return 'hour';
      case 'day': return 'day';
      case 'week': return 'week';
      case 'month': return 'month';
      default: return 'hour';
    }
  }

  private extractDataPoints(
    stats: Array<{ start: string; mean?: number; min?: number; max?: number; sum?: number; state?: number }>,
    statisticsType: StatisticsType
  ): ChartDataPoint[] {
    return stats
      .map((item) => {
        let value: number | undefined;
        switch (statisticsType) {
          case 'mean': value = item.mean; break;
          case 'min': value = item.min; break;
          case 'max': value = item.max; break;
          case 'sum': value = item.sum; break;
          case 'state': value = item.state; break;
          case 'change': value = item.state ?? item.sum ?? item.mean; break;
        }
        return {
          timestamp: new Date(item.start).getTime(),
          value: value ?? 0,
        };
      })
      .filter((point) => !isNaN(point.value));
  }
}
