import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import type { EntityDataSeries } from '../services/data-fetcher';
import type { LegendConfig } from '../storage/chart-storage';

export interface SeriesConfig {
  entityId: string;
  chartType: 'bar' | 'line' | 'area';
  axisId: 'left' | 'right';
  color?: string;
}

export interface AxisInfo {
  id: 'left' | 'right';
  unit: string;
  name?: string;
}

export interface ChartConfig {
  title?: string;
  series: EntityDataSeries[];
  seriesConfig: SeriesConfig[];
  axes: AxisInfo[];
  showLegend?: boolean;
  showTooltip?: boolean;
  legendConfig?: LegendConfig;
}

@customElement('chart-canvas')
export class ChartCanvas extends LitElement {
  @property({ type: Object }) config?: ChartConfig;

  @query('.chart-container') private chartContainer!: HTMLDivElement;

  @state() private tableStats: Array<{
    name: string;
    color: string;
    unit: string;
    min: number;
    avg: number;
    max: number;
    current: number;
  }> = [];

  @state() private visibleRange?: { start: number; end: number };

  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .chart-container {
      width: 100%;
      height: 400px;
    }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 14px;
      color: #fff;
    }

    .stats-table th,
    .stats-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stats-table th {
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
    }

    .stats-table td:not(:first-child) {
      text-align: right;
      font-family: monospace;
    }

    .color-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 8px;
    }
  `;

  protected render() {
    const showTable = this.config?.legendConfig?.mode === 'table';
    return html`
      <div class="chart-container"></div>
      ${showTable ? this.renderStatsTable() : ''}
    `;
  }

  private renderStatsTable() {
    const cfg = this.config?.legendConfig;
    if (!cfg) return '';

    const hasStats = cfg.showMin || cfg.showAvg || cfg.showMax || cfg.showCurrent;
    if (!hasStats && this.tableStats.length === 0) return '';

    return html`
      <table class="stats-table">
        <thead>
          <tr>
            <th>Series</th>
            ${cfg.showMin ? html`<th>Min</th>` : ''}
            ${cfg.showAvg ? html`<th>Avg</th>` : ''}
            ${cfg.showMax ? html`<th>Max</th>` : ''}
            ${cfg.showCurrent ? html`<th>Current</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${this.tableStats.map(stat => html`
            <tr>
              <td>
                <span class="color-dot" style="background: ${stat.color}"></span>
                ${stat.name}${stat.unit ? ` (${stat.unit})` : ''}
              </td>
              ${cfg.showMin ? html`<td>${stat.min.toFixed(2)}</td>` : ''}
              ${cfg.showAvg ? html`<td>${stat.avg.toFixed(2)}</td>` : ''}
              ${cfg.showMax ? html`<td>${stat.max.toFixed(2)}</td>` : ''}
              ${cfg.showCurrent ? html`<td>${stat.current.toFixed(2)}</td>` : ''}
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.initChart();
    this.setupResizeObserver();
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('config') && this.config) {
      this.updateChart();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.chart?.dispose();
    this.resizeObserver?.disconnect();
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    this.chart = echarts.init(this.chartContainer, undefined, {
      renderer: 'canvas',
    });

    // Listen for zoom events to update stats
    this.chart.on('dataZoom', () => {
      this.handleDataZoom();
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer);
  }

  private calculateStats(dataPoints: number[]): { min: number; avg: number; max: number } {
    if (dataPoints.length === 0) {
      return { min: 0, avg: 0, max: 0 };
    }
    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const avg = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
    return { min, avg, max };
  }

  private updateChart(): void {
    if (!this.chart || !this.config) return;

    const option = this.buildChartOption(this.config);
    this.chart.setOption(option, { notMerge: false });

    // Update table stats if in table mode
    if (this.config.legendConfig?.mode === 'table') {
      this.updateTableStats();
    }
  }

  private updateTableStats(): void {
    if (!this.config) return;

    const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

    this.tableStats = this.config.series.map((s, index) => {
      const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
      const stats = this.calculateStats(values);
      const current = values.length > 0 ? values[values.length - 1] : 0;

      const cfg = this.config?.seriesConfig.find(c => c.entityId === s.entityId);
      const color = cfg?.color || colors[index % colors.length];

      return {
        name: s.name,
        color,
        unit: s.unit || '',
        ...stats,
        current,
      };
    });
  }

  private handleDataZoom(): void {
    if (!this.chart || !this.config) return;

    const option = this.chart.getOption() as any;
    const dataZoom = option.dataZoom?.[0];

    if (dataZoom && dataZoom.startValue !== undefined && dataZoom.endValue !== undefined) {
      this.visibleRange = {
        start: dataZoom.startValue,
        end: dataZoom.endValue,
      };
    } else {
      this.visibleRange = undefined;
    }

    // Recalculate stats for visible range
    this.updateStatsForVisibleRange();
  }

  private updateStatsForVisibleRange(): void {
    if (!this.config) return;

    const cfg = this.config.legendConfig;
    if (!cfg || (!cfg.showMin && !cfg.showAvg && !cfg.showMax && !cfg.showCurrent)) return;

    // Filter data to visible range
    const filteredSeries = this.config.series.map(s => {
      let points = s.dataPoints;
      if (this.visibleRange) {
        points = s.dataPoints.filter(p =>
          p.timestamp >= this.visibleRange!.start && p.timestamp <= this.visibleRange!.end
        );
      }
      return { ...s, dataPoints: points };
    });

    // Update table stats
    const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

    this.tableStats = filteredSeries.map((s, index) => {
      const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
      const stats = this.calculateStats(values);
      const current = values.length > 0 ? values[values.length - 1] : 0;

      const seriesCfg = this.config?.seriesConfig.find(c => c.entityId === s.entityId);
      const color = seriesCfg?.color || colors[index % colors.length];

      return {
        name: s.name,
        color,
        unit: s.unit || '',
        ...stats,
        current,
      };
    });

    // Update legend formatter if in list mode
    if (cfg.mode === 'list' && this.chart) {
      this.updateLegendForVisibleRange(filteredSeries);
    }
  }

  private updateLegendForVisibleRange(filteredSeries: EntityDataSeries[]): void {
    if (!this.config?.legendConfig || !this.chart) return;

    const cfg = this.config.legendConfig;
    const seriesStats = new Map<string, { min: number; avg: number; max: number; current: number; unit: string }>();

    for (const s of filteredSeries) {
      const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
      const stats = this.calculateStats(values);
      const current = values.length > 0 ? values[values.length - 1] : 0;
      seriesStats.set(s.name, { ...stats, current, unit: s.unit || '' });
    }

    const legendFormatter = (name: string) => {
      const stats = seriesStats.get(name);
      if (!stats) return name;

      const parts: string[] = [];
      const unit = stats.unit ? ` ${stats.unit}` : '';
      if (cfg.showMin) parts.push(`min: ${stats.min.toFixed(1)}${unit}`);
      if (cfg.showAvg) parts.push(`avg: ${stats.avg.toFixed(1)}${unit}`);
      if (cfg.showMax) parts.push(`max: ${stats.max.toFixed(1)}${unit}`);
      if (cfg.showCurrent) parts.push(`current: ${stats.current.toFixed(1)}${unit}`);

      if (parts.length === 0) return name;
      return `${name} (${parts.join(', ')})`;
    };

    this.chart.setOption({
      legend: {
        formatter: legendFormatter,
      },
    }, { notMerge: false });
  }

  public updateChartConfig(config: ChartConfig): void {
    if (!this.chart) return;
    const option = this.buildChartOption(config);
    this.chart.setOption(option, true);
  }

  private buildChartOption(config: ChartConfig): EChartsOption {
    const { series, seriesConfig, axes, title, showLegend = true, showTooltip = true, legendConfig } = config;

    // Calculate stats for each series if needed
    const seriesStats = new Map<string, { min: number; avg: number; max: number; current: number; unit: string }>();
    if (legendConfig && (legendConfig.showMin || legendConfig.showAvg || legendConfig.showMax || legendConfig.showCurrent)) {
      for (const s of series) {
        const values = s.dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined) as number[];
        const stats = this.calculateStats(values);
        const current = values.length > 0 ? values[values.length - 1] : 0;
        seriesStats.set(s.name, { ...stats, current, unit: s.unit || '' });
      }
    }

    // Build legend formatter
    const legendFormatter = (name: string) => {
      if (!legendConfig || legendConfig.mode === 'table') {
        return name;
      }
      const stats = seriesStats.get(name);
      if (!stats) return name;

      const parts: string[] = [];
      const unit = stats.unit ? ` ${stats.unit}` : '';
      if (legendConfig.showMin) parts.push(`min: ${stats.min.toFixed(1)}${unit}`);
      if (legendConfig.showAvg) parts.push(`avg: ${stats.avg.toFixed(1)}${unit}`);
      if (legendConfig.showMax) parts.push(`max: ${stats.max.toFixed(1)}${unit}`);
      if (legendConfig.showCurrent) parts.push(`current: ${stats.current.toFixed(1)}${unit}`);

      if (parts.length === 0) return name;
      return `${name} (${parts.join(', ')})`;
    };

    // Build y-axes (max 2)
    const yAxis = axes.map((axis, index) => {
      const position = axis.id === 'left' ? ('left' as const) : ('right' as const);
      return {
        type: 'value' as const,
        name: axis.name || axis.unit,
        position,
        axisLine: { show: true },
        axisLabel: {
          formatter: (value: number) => {
            if (Math.abs(value) >= 1000) {
              return `${(value / 1000).toFixed(1)}k`;
            }
            return `${value}`;
          },
        },
        splitLine: { show: index === 0 }, // Only show grid for left axis
      };
    });

    // Build series with proper chart types
    const chartSeries = series.map((s) => {
      const cfg = seriesConfig.find((c) => c.entityId === s.entityId);
      const axisIndex = axes.findIndex((a) => a.id === cfg?.axisId);

      const baseSeries = {
        name: s.name,
        yAxisIndex: axisIndex >= 0 ? axisIndex : 0,
        data: s.dataPoints.map((p) => [p.timestamp, p.value]),
        itemStyle: cfg?.color ? { color: cfg.color } : undefined,
      };

      if (cfg?.chartType === 'bar') {
        return {
          ...baseSeries,
          type: 'bar' as const,
          barMaxWidth: 50,
        };
      } else if (cfg?.chartType === 'area') {
        return {
          ...baseSeries,
          type: 'line' as const,
          smooth: true,
          areaStyle: {},
        };
      } else {
        return {
          ...baseSeries,
          type: 'line' as const,
          smooth: true,
        };
      }
    });

    return {
      title: title ? { text: title, left: 'center', textStyle: { color: '#fff' } } : undefined,
      tooltip: showTooltip ? {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const date = new Date(params[0].value[0]);
          const dateStr = date.toLocaleDateString();
          let html = `<strong>${dateStr}</strong><br/>`;
          for (const p of params) {
            const seriesData = series.find((s) => s.name === p.seriesName);
            const unit = seriesData?.unit || '';
            html += `${p.marker} ${p.seriesName}: ${p.value[1]?.toFixed(2)} ${unit}<br/>`;
          }
          return html;
        },
      } : undefined,
      legend: showLegend && legendConfig?.mode !== 'table' ? {
        show: true,
        data: series.map((s) => s.name),
        bottom: 0,
        textStyle: { color: '#fff' },
        formatter: legendFormatter,
      } : { show: false },
      grid: {
        left: '10%',
        right: axes.length > 1 ? '10%' : '5%',
        bottom: showLegend && legendConfig?.mode !== 'table' ? '15%' : '10%',
        top: title ? '15%' : '10%',
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
          },
        },
      },
      yAxis,
      series: chartSeries,
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
      ],
    };
  }

  /**
   * Export chart as image (for future use).
   */
  public exportAsImage(): string | undefined {
    return this.chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  }
}
