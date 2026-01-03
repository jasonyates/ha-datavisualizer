import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html, expect as expectEl } from '@open-wc/testing';
import './chart-canvas';
import type { ChartCanvas } from './chart-canvas';

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
});
