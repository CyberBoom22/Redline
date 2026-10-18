/**
 * Geometry for the boost gauge. Kept free of React so it can be unit tested.
 *
 * The dial sweeps 270° clockwise, starting at 135° (bottom-left) and ending at
 * 45° (bottom-right), in SVG coordinates where +y points down.
 */
export const GAUGE_CENTER = 100;
export const GAUGE_START_DEG = 135;
export const GAUGE_SWEEP_DEG = 270;

/** value/max, clamped to 0–1. A non-positive or non-finite max reads as 0. */
export function gaugePct(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

export function gaugeAngle(pct: number): number {
  return GAUGE_START_DEG + pct * GAUGE_SWEEP_DEG;
}

export function polar(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [GAUGE_CENTER + r * Math.cos(rad), GAUGE_CENTER + r * Math.sin(rad)];
}

const fmt = (n: number) => Number(n.toFixed(3));

/** Clockwise arc path from one angle to another at radius r. */
export function arcPath(fromDeg: number, toDeg: number, r: number): string {
  const [x1, y1] = polar(fromDeg, r);
  const [x2, y2] = polar(toDeg, r);
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${fmt(x1)} ${fmt(y1)} A ${r} ${r} 0 ${largeArc} 1 ${fmt(x2)} ${fmt(y2)}`;
}
