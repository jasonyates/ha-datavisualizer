import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import type { EntityDataSeries } from '../services/data-fetcher';

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
}

@customElement('chart-canvas')
export class ChartCanvas extends LitElement {
  @property({ type: Object }) config?: ChartConfig;

  @query('.chart-container') private chartContainer!: HTMLDivElement;

  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 400px;
    }

    .chart-container {
      width: 100%;
      height: 100%;
    }
  `;

  protected render() {
    return html`<div class="chart-container"></div>`;
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
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer);
  }

  private updateChart(): void {
    if (!this.chart || !this.config) return;

    const option = this.buildChartOption(this.config);
    this.chart.setOption(option, { notMerge: false });
  }

  public updateChartConfig(config: ChartConfig): void {
    if (!this.chart) return;
    const option = this.buildChartOption(config);
    this.chart.setOption(option, true);
  }

  private buildChartOption(config: ChartConfig): EChartsOption {
    const { series, seriesConfig, axes, title, showLegend = true, showTooltip = true } = config;

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
      legend: showLegend ? {
        data: series.map((s) => s.name),
        bottom: 0,
        textStyle: { color: '#fff' },
      } : undefined,
      grid: {
        left: '10%',
        right: axes.length > 1 ? '10%' : '5%',
        bottom: showLegend ? '15%' : '10%',
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
