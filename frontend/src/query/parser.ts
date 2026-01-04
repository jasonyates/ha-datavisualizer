import Fuse from 'fuse.js';
import type { HassEntityRegistry } from '../types/homeassistant';

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter';
export type Aggregation = 'hour' | 'day' | 'week' | 'month';

export interface TimeRange {
  preset?: string;
  start?: Date;
  end?: Date;
}

export interface ParsedQuery {
  entities: string[];
  timeRange: TimeRange;
  chartType?: ChartType;
  aggregation?: Aggregation;
  stacked?: boolean;
  comparison?: boolean;
  rawQuery: string;
}

const TIME_PATTERNS: Array<{ pattern: RegExp; preset: string }> = [
  { pattern: /last\s+(\d+)\s+days?/i, preset: '$1d' },
  { pattern: /past\s+(\d+)\s+days?/i, preset: '$1d' },
  { pattern: /last\s+(\d+)\s+hours?/i, preset: '$1h' },
  { pattern: /last\s+week/i, preset: '7d' },
  { pattern: /this\s+week/i, preset: '7d' },
  { pattern: /last\s+month/i, preset: '30d' },
  { pattern: /this\s+month/i, preset: '30d' },
  { pattern: /yesterday/i, preset: '1d' },
  { pattern: /today/i, preset: '24h' },
  { pattern: /last\s+24\s+hours?/i, preset: '24h' },
];

const CHART_TYPE_PATTERNS: Array<{ pattern: RegExp; type: ChartType }> = [
  { pattern: /bar\s+chart|as\s+bar/i, type: 'bar' },
  { pattern: /line\s+chart|as\s+line/i, type: 'line' },
  { pattern: /area\s+chart|as\s+area/i, type: 'area' },
  { pattern: /pie\s+chart|as\s+pie/i, type: 'pie' },
  { pattern: /scatter|correlation/i, type: 'scatter' },
];

const AGGREGATION_PATTERNS: Array<{ pattern: RegExp; agg: Aggregation }> = [
  { pattern: /hourly|per\s+hour/i, agg: 'hour' },
  { pattern: /daily|per\s+day/i, agg: 'day' },
  { pattern: /weekly|per\s+week/i, agg: 'week' },
  { pattern: /monthly|per\s+month/i, agg: 'month' },
];

export class QueryParser {
  private fuse: Fuse<HassEntityRegistry>;

  constructor(entities: HassEntityRegistry[]) {
    this.fuse = new Fuse(entities, {
      keys: [
        { name: 'entity_id', weight: 0.3 },
        { name: 'name', weight: 0.5 },
        { name: 'original_name', weight: 0.2 },
      ],
      threshold: 0.6,
      includeScore: true,
    });
  }

  parse(query: string): ParsedQuery {
    const result: ParsedQuery = {
      entities: [],
      timeRange: { preset: '24h' },
      rawQuery: query,
    };

    result.timeRange = this.parseTimeRange(query);
    result.chartType = this.parseChartType(query);
    result.aggregation = this.parseAggregation(query);
    result.stacked = /stack(ed)?/i.test(query);
    result.comparison = /\s+vs\.?\s+|\s+versus\s+|\s+compared\s+to\s+|\s+against\s+/i.test(query);
    result.entities = this.parseEntities(query);

    return result;
  }

  private parseTimeRange(query: string): TimeRange {
    for (const { pattern, preset } of TIME_PATTERNS) {
      const match = query.match(pattern);
      if (match) {
        if (preset.includes('$1') && match[1]) {
          return { preset: preset.replace('$1', match[1]) };
        }
        return { preset };
      }
    }
    return { preset: '24h' };
  }

  private parseChartType(query: string): ChartType | undefined {
    for (const { pattern, type } of CHART_TYPE_PATTERNS) {
      if (pattern.test(query)) {
        return type;
      }
    }
    return undefined;
  }

  private parseAggregation(query: string): Aggregation | undefined {
    for (const { pattern, agg } of AGGREGATION_PATTERNS) {
      if (pattern.test(query)) {
        return agg;
      }
    }
    return undefined;
  }

  private parseEntities(query: string): string[] {
    // First split by comparison operators before cleaning
    const parts = query.split(/\s+vs\.?\s+|\s+versus\s+|\s+compared\s+to\s+|\s+against\s+/i);

    const foundEntities: string[] = [];

    for (const part of parts) {
      // Split by "and" to handle multiple entities
      const searchTerms = part.split(/\s+and\s+/i);

      for (let term of searchTerms) {
        // Clean up the term
        term = term
          .replace(/last\s+\d+\s+\w+/gi, '')
          .replace(/past\s+\d+\s+\w+/gi, '')
          .replace(/last\s+(week|month|year|hour|day)/gi, '')
          .replace(/this\s+(week|month|year|hour|day)/gi, '')
          .replace(/yesterday|today/gi, '')
          .replace(/as\s+\w+\s+chart/gi, '')
          .replace(/\b(bar|line|area|pie|scatter)\s+chart\b/gi, '')
          .replace(/\b(hourly|daily|weekly|monthly)\b/gi, '')
          .replace(/\b(stacked?|show|me|the|or|of)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (term.length < 2) continue;

        const results = this.fuse.search(term);
        if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.65) {
          const entityId = results[0].item.entity_id;
          if (!foundEntities.includes(entityId)) {
            foundEntities.push(entityId);
          }
        }
      }
    }

    return foundEntities;
  }

  static presetToDateRange(preset: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    const match = preset.match(/^(\d+)(h|d|w|m)$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 'h':
          start.setHours(start.getHours() - value);
          break;
        case 'd':
          start.setDate(start.getDate() - value);
          break;
        case 'w':
          start.setDate(start.getDate() - value * 7);
          break;
        case 'm':
          start.setMonth(start.getMonth() - value);
          break;
      }
    }

    return { start, end };
  }
}
