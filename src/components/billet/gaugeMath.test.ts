import { describe, expect, test } from 'bun:test';
import { arcPath, gaugeAngle, gaugePct, polar } from './gaugeMath';

describe('gaugePct', () => {
  test('clamps to 0–1', () => {
    expect(gaugePct(15, 30)).toBe(0.5);
    expect(gaugePct(-4, 30)).toBe(0);
    expect(gaugePct(45, 30)).toBe(1);
  });
  test('treats a bad max as empty rather than dividing by zero', () => {
    expect(gaugePct(10, 0)).toBe(0);
    expect(gaugePct(10, Number.NaN)).toBe(0);
  });
});

describe('gaugeAngle', () => {
  test('starts bottom-left and ends bottom-right', () => {
    expect(gaugeAngle(0)).toBe(135);
    expect(gaugeAngle(0.5)).toBe(270);
    expect(gaugeAngle(1)).toBe(405);
  });
});

describe('polar', () => {
  test('270° points straight up in SVG coordinates', () => {
    const [x, y] = polar(270, 80);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(20);
  });
});

describe('arcPath', () => {
  test('uses the large-arc flag only past 180°', () => {
    expect(arcPath(135, 405, 80)).toContain(' 0 1 1 ');
    expect(arcPath(135, 270, 80)).toContain(' 0 0 1 ');
  });
});
