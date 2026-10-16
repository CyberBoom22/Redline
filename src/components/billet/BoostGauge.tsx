import React from 'react';
import { arcPath, gaugeAngle, gaugePct, GAUGE_START_DEG, GAUGE_SWEEP_DEG, polar } from './gaugeMath';

interface BoostGaugeProps {
  /** Current reading. Supplied by the app — the gauge never invents one. */
  value: number;
  /** Full-scale reading. */
  max: number;
  /** Unit shown after the value. */
  unit?: string;
  /** Word printed on the dial face. */
  label?: string;
  /** Fraction of the sweep painted as redline, measured from the top end. */
  redlineFraction?: number;
  className?: string;
}

const formatValue = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Analogue boost dial: dark face, 270° sweep, anodized-red fill up to the
 * value and a redline band over the last part of the scale.
 */
export const BoostGauge: React.FC<BoostGaugeProps> = ({
  value,
  max,
  unit = 'PSI',
  label = 'BOOST',
  redlineFraction = 0.15,
  className = '',
}) => {
  const pct = gaugePct(value, max);
  const end = GAUGE_START_DEG + GAUGE_SWEEP_DEG;
  const valueDeg = gaugeAngle(pct);
  const redlineStart = gaugeAngle(1 - redlineFraction);
  const [nx, ny] = polar(valueDeg, 62);
  const readout = `${formatValue(value)} ${unit}`;

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${label.toLowerCase()} gauge: ${readout} of ${formatValue(max)} ${unit}`}
      className={className}
    >
      <circle cx="100" cy="100" r="96" fill="var(--ink)" stroke="var(--on-dark)" strokeWidth="3" />

      {/* Track, redline band, then the value fill on top of both. */}
      <path d={arcPath(GAUGE_START_DEG, end, 80)} fill="none" stroke="#33373D" strokeWidth="10" />
      <path d={arcPath(redlineStart, end, 80)} fill="none" stroke="var(--redline)" strokeWidth="10" />
      {pct > 0 && (
        <path d={arcPath(GAUGE_START_DEG, valueDeg, 80)} fill="none" stroke="var(--accent)" strokeWidth="10" />
      )}

      <path
        d={arcPath(GAUGE_START_DEG, end, 64)}
        fill="none"
        stroke="#C9CDD1"
        strokeWidth="6"
        strokeDasharray="2 10"
      />

      <line x1="100" y1="100" x2={nx} y2={ny} stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="10" fill="#C9CDD1" />

      <text
        x="100"
        y="140"
        textAnchor="middle"
        fontFamily="Michroma, sans-serif"
        fontSize="11"
        letterSpacing="1.5"
        fill="#C9CDD1"
      >
        {label}
      </text>
      <text x="100" y="158" textAnchor="middle" fontFamily="Michroma, sans-serif" fontSize="13" fill="#FFFFFF">
        {readout}
      </text>
    </svg>
  );
};
