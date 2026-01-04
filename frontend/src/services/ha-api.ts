import type {
  HomeAssistant,
  HassEntityRegistry,
  HassHistoryResult,
  HassStatisticsResult,
  HassArea,
  HassDevice,
} from '../types/homeassistant';

export type StatisticsPeriod = '5minute' | 'hour' | 'day' | 'week' | 'month';

export class HaApi {
  constructor(private hass: HomeAssistant) {}

  /**
   * Fetch the entity registry (all registered entities with metadata).
   */
  async getEntityRegistry(): Promise<HassEntityRegistry[]> {
    return this.hass.callWS<HassEntityRegistry[]>({
      type: 'config/entity_registry/list',
    });
  }

  /**
   * Fetch area registry.
   */
  async getAreas(): Promise<HassArea[]> {
    return this.hass.callWS<HassArea[]>({
      type: 'config/area_registry/list',
    });
  }

  /**
   * Fetch device registry.
   */
  async getDeviceRegistry(): Promise<HassDevice[]> {
    return this.hass.callWS<HassDevice[]>({
      type: 'config/device_registry/list',
    });
  }

  /**
   * Fetch raw history data for an entity within a time range.
   * Best for short time ranges (< 24 hours).
   */
  async getHistory(
    entityId: string,
    start: Date,
    end: Date
  ): Promise<HassHistoryResult[]> {
    const result = await this.hass.callWS<HassHistoryResult[][]>({
      type: 'history/history_during_period',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      entity_ids: [entityId],
      minimal_response: true,
      significant_changes_only: false,
    });
    return result[0] || [];
  }

  /**
   * Fetch aggregated statistics for an entity.
   * Best for longer time ranges (> 24 hours).
   */
  async getStatistics(
    entityId: string,
    start: Date,
    end: Date,
    period: StatisticsPeriod = 'hour'
  ): Promise<HassStatisticsResult[]> {
    const result = await this.hass.callWS<Record<string, HassStatisticsResult[]>>({
      type: 'recorder/statistics_during_period',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      statistic_ids: [entityId],
      period,
    });
    return result[entityId] || [];
  }

  /**
   * Get current state of an entity.
   */
  getState(entityId: string) {
    return this.hass.states[entityId];
  }

  /**
   * Get all current states.
   */
  getAllStates() {
    return this.hass.states;
  }
}
