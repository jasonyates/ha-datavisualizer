import { describe, it, expect } from 'vitest';
import { calculateChange, type DataPoint } from './statistics';

describe('calculateChange', () => {
  it('should calculate deltas between consecutive values', () => {
    const data: DataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 2000, value: 150 },
      { timestamp: 3000, value: 180 },
    ];

    const result = calculateChange(data);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ timestamp: 2000, value: 50 });
    expect(result[1]).toEqual({ timestamp: 3000, value: 30 });
  });

  it('should return empty array for single data point', () => {
    const data: DataPoint[] = [{ timestamp: 1000, value: 100 }];
    const result = calculateChange(data);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    const result = calculateChange([]);
    expect(result).toEqual([]);
  });

  it('should handle negative deltas', () => {
    const data: DataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 2000, value: 80 },
    ];

    const result = calculateChange(data);

    expect(result[0].value).toBe(-20);
  });
});
