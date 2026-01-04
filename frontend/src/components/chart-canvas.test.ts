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
});
