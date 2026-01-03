import type { HaApi, StatisticsPeriod } from './ha-api';

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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export class DataFetcher {
  constructor(private api: HaApi) {}

  /**
   * Fetch data for an entity with automatic resolution selection.
   * - < 24 hours: raw history (high resolution)
   * - 1-7 days: 5-minute statistics
   * - > 7 days: hourly statistics
   */
  async fetchData(
    entityId: string,
    start: Date,
    end: Date,
    forceResolution?: 'history' | StatisticsPeriod
  ): Promise<EntityDataSeries> {
    const state = this.api.getState(entityId);
    const unit = (state?.attributes?.unit_of_measurement as string) || '';
    const name = (state?.attributes?.friendly_name as string) || entityId;

    const rangeMs = end.getTime() - start.getTime();
    let dataPoints: ChartDataPoint[];

    if (forceResolution === 'history' || (!forceResolution && rangeMs < DAY_MS)) {
      // Use raw history for short ranges
      dataPoints = await this.fetchHistoryData(entityId, start, end);
    } else {
      // Use statistics for longer ranges
      const period = this.selectStatisticsPeriod(rangeMs, forceResolution);
      dataPoints = await this.fetchStatisticsData(entityId, start, end, period);
    }

    return {
      entityId,
      name,
      unit,
      dataPoints,
    };
  }

  /**
   * Fetch data for multiple entities in parallel.
   */
  async fetchMultiple(
    entityIds: string[],
    start: Date,
    end: Date
  ): Promise<EntityDataSeries[]> {
    return Promise.all(
      entityIds.map((id) => this.fetchData(id, start, end))
    );
  }

  private selectStatisticsPeriod(
    rangeMs: number,
    forceResolution?: StatisticsPeriod
  ): StatisticsPeriod {
    if (forceResolution) return forceResolution;

    if (rangeMs <= 7 * DAY_MS) {
      return '5minute';
    }
    return 'hour';
  }

  private async fetchHistoryData(
    entityId: string,
    start: Date,
    end: Date
  ): Promise<ChartDataPoint[]> {
    const history = await this.api.getHistory(entityId, start, end);

    return history
      .map((item) => ({
        timestamp: new Date(item.last_changed).getTime(),
        value: parseFloat(item.state),
      }))
      .filter((point) => !isNaN(point.value));
  }

  private async fetchStatisticsData(
    entityId: string,
    start: Date,
    end: Date,
    period: StatisticsPeriod
  ): Promise<ChartDataPoint[]> {
    const stats = await this.api.getStatistics(entityId, start, end, period);

    return stats
      .map((item) => ({
        timestamp: new Date(item.start).getTime(),
        value: item.mean ?? item.sum ?? item.state ?? 0,
      }))
      .filter((point) => !isNaN(point.value));
  }
}
