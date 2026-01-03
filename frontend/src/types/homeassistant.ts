/**
 * Type definitions for Home Assistant frontend integration.
 * These mirror the types from HA's frontend repo.
 */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HassEntityRegistry {
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  disabled_by: string | null;
  area_id: string | null;
  device_id: string | null;
  original_name: string | null;
}

export interface HassArea {
  area_id: string;
  name: string;
  picture: string | null;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  services: Record<string, Record<string, unknown>>;
  user: {
    id: string;
    name: string;
    is_admin: boolean;
  };
  language: string;
  locale: {
    language: string;
    number_format: string;
    time_format: string;
  };
  themes: {
    darkMode: boolean;
    theme: string;
  };
  connection: HassConnection;
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
  callApi: <T>(method: string, path: string, data?: unknown) => Promise<T>;
}

export interface HassConnection {
  subscribeEvents: (
    callback: (event: unknown) => void,
    eventType?: string
  ) => Promise<() => void>;
  sendMessagePromise: <T>(msg: Record<string, unknown>) => Promise<T>;
}

export interface HassHistoryResult {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HassStatisticsResult {
  statistic_id: string;
  start: string;
  end: string;
  mean?: number;
  min?: number;
  max?: number;
  sum?: number;
  state?: number;
}

declare global {
  interface HTMLElementTagNameMap {
    'ha-data-visualizer': HaDataVisualizer;
  }
}

export type HaDataVisualizer = import('../ha-data-visualizer').HaDataVisualizer;
