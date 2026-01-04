import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ChartCanvas } from './chart-canvas';
import type { ChartConfig } from './chart-canvas';

// Mock ECharts
vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    getOption: vi.fn(() => ({})),
    on: vi.fn(),
    getDataURL: vi.fn(),
  })),
}));

describe('ChartCanvas', () => {
  it('should render a chart container', async () => {
    const el = await fixture<ChartCanvas>(html`<chart-canvas></chart-canvas>`);
    const container = el.shadowRoot?.querySelector('.chart-container');
    expect(container).toBeTruthy();
  });

  it('should initialize echarts on first update', async () => {
    const echarts = await import('echarts');
    const el = await fixture<ChartCanvas>(html`<chart-canvas></chart-canvas>`);
    await el.updateComplete;

    expect(echarts.init).toHaveBeenCalled();
  });

  describe('white text styling', () => {
    it('should set white color for title text', () => {
      const config: ChartConfig = {
        title: 'Test Title',
        series: [],
        seriesConfig: [],
        axes: [{ id: 'left', unit: '' }],
      };

      const canvas = new ChartCanvas();
      const option = (canvas as any).buildChartOption(config);

      expect(option.title?.textStyle?.color).toBe('#fff');
    });

    it('should set white color for legend text', () => {
      const config: ChartConfig = {
        series: [{ entityId: 'sensor.test', name: 'Test', unit: '', dataPoints: [] }],
        seriesConfig: [],
        axes: [{ id: 'left', unit: '' }],
        showLegend: true,
      };

      const canvas = new ChartCanvas();
      const option = (canvas as any).buildChartOption(config);

      expect(option.legend?.textStyle?.color).toBe('#fff');
    });
  });

  describe('calculateStats', () => {
    it('should calculate min, avg, max from data points', () => {
      const canvas = new ChartCanvas();
      const dataPoints = [10, 20, 30, 40, 50];

      const stats = (canvas as any).calculateStats(dataPoints);

      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.avg).toBe(30);
    });

    it('should handle single value', () => {
      const canvas = new ChartCanvas();
      const dataPoints = [42];

      const stats = (canvas as any).calculateStats(dataPoints);

      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.avg).toBe(42);
    });

    it('should handle decimal values', () => {
      const canvas = new ChartCanvas();
      const dataPoints = [1.5, 2.5, 3.5];

      const stats = (canvas as any).calculateStats(dataPoints);

      expect(stats.min).toBe(1.5);
      expect(stats.max).toBe(3.5);
      expect(stats.avg).toBeCloseTo(2.5);
    });

    it('should return zeros for empty array', () => {
      const canvas = new ChartCanvas();
      const dataPoints: number[] = [];

      const stats = (canvas as any).calculateStats(dataPoints);

      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.avg).toBe(0);
    });
  });
});
