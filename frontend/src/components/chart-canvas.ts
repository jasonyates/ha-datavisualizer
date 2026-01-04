import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import type { EntityDataSeries } from '../services/data-fetcher';

export interface AxisConfig {
  id: string;
  position: 'left' | 'right';
  name?: string;
  unit?: string;
  entityIds: string[];
  chartType: 'line' | 'bar' | 'area';
  stacked?: boolean;
}

export interface ChartConfig {
  title?: string;
  series: EntityDataSeries[];
  axes: AxisConfig[];
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
    this.chart.setOption(option, { notMerge: true });
  }

  private buildChartOption(config: ChartConfig): EChartsOption {
    const { series, axes, title, showLegend = true, showTooltip = true } = config;

    // Build y-axes
    const yAxis = axes.map((axis, index) => ({
      type: 'value' as const,
      name: axis.name || axis.unit,
      position: axis.position,
      axisLine: { show: true },
      axisLabel: {
        formatter: (value: number) => `${value}${axis.unit ? ` ${axis.unit}` : ''}`,
      },
      offset: index > 1 ? (index - 1) * 60 : 0,
    }));

    // Build series
    const chartSeries = series.map((s) => {
      const axisConfig = axes.find((a) => a.entityIds.includes(s.entityId));
      const axisIndex = axes.indexOf(axisConfig!);

      return {
        name: s.name,
        type: axisConfig?.chartType === 'area' ? 'line' : axisConfig?.chartType || 'line',
        yAxisIndex: axisIndex,
        data: s.dataPoints.map((p) => [p.timestamp, p.value]),
        smooth: true,
        areaStyle: axisConfig?.chartType === 'area' ? {} : undefined,
        stack: axisConfig?.stacked ? axisConfig.id : undefined,
      };
    });

    return {
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: showTooltip ? {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      } : undefined,
      legend: showLegend ? {
        data: series.map((s) => s.name),
        bottom: 0,
      } : undefined,
      grid: {
        left: '3%',
        right: axes.length > 1 ? '10%' : '3%',
        bottom: showLegend ? '15%' : '3%',
        top: title ? '15%' : '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          },
        },
      },
      yAxis,
      series: chartSeries,
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: showLegend ? '8%' : '3%' },
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
