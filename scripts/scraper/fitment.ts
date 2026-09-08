import { PLATFORMS } from '../../src/data/platforms';
import { EngineId, PartCategory } from '../../src/types';

/**
 * Maps free-text from a product page onto Stage0's engine ids.
 *
 * Chassis codes and trim names come straight from `src/data/platforms.ts` so
 * the vehicle list stays the single source of truth; the extra patterns below
 * cover the vendor shorthand that the platform data does not carry.
 */

interface EngineMatcher {
  engineId: EngineId;
  patterns: RegExp[];
}

/** Vendor shorthand that platform data alone would miss. */
const EXTRA_PATTERNS: Record<EngineId, string[]> = {
  b58_gen1: [
    'b58b30m0',
    'b58 gen ?1',
    '\\bf2[0-9]\\b',
    '\\bf3[0-9]\\b',
    'm240i',
    '\\b340i\\b',
    '\\b440i\\b',
    '\\b540i\\b',
    'supra.*2020',
  ],
  b58_gen2: [
    'b58b30o1',
    'b58 gen ?2',
    '\\bb58tu\\b',
    '\\bg2[0-9]\\b',
    '\\bg42\\b',
    'm340i',
    'm440i',
    'z4 m40i',
    'supra.*(2021|2022|2023|2024|2025)',
  ],
  vr30_redsport: ['red ?sport', 'rs400', '\\brz34\\b', 'nissan z\\b'],
  vr30_luxe: ['vr30ddtt', '\\bvr30\\b', '3\\.0t', 'q50.*(luxe|pure)', 'q60.*(luxe|premium)'],
  vq37vhr: ['vq37', '\\bvhr\\b', 'vvel', '\\b370z\\b', '\\bg37\\b', '\\bz34\\b', '\\bv36\\b'],
};

const MATCHERS: EngineMatcher[] = buildMatchers();

function buildMatchers(): EngineMatcher[] {
  const out: EngineMatcher[] = [];
  for (const platform of PLATFORMS) {
    for (const engine of platform.engines) {
      const tokens = new Set<string>();
      // Chassis entries look like "G20 (3 Series)" — the code before the paren
      // is the useful, unambiguous part.
      for (const chassis of engine.chassisList) {
        const code = chassis.split('(')[0].trim();
        if (code.length >= 3) tokens.add(escapeRegex(code));
      }
      for (const trim of engine.trims) {
        const cleaned = trim.split('/')[0].trim();
        if (cleaned.length >= 4) tokens.add(escapeRegex(cleaned));
      }
      const patterns = [
        ...[...tokens].map((t) => new RegExp(`\\b${t}\\b`, 'i')),
        ...(EXTRA_PATTERNS[engine.id] ?? []).map((p) => new RegExp(p, 'i')),
      ];
      out.push({ engineId: engine.id, patterns });
    }
  }
  return out;
}

/**
 * Both B58 generations share most bolt-ons, so a page that says only "B58"
 * with no generation marker fits both rather than neither.
 */
export function matchEngines(...texts: (string | null | undefined)[]): EngineId[] {
  const haystack = texts.filter(Boolean).join(' \n ').toLowerCase();
  if (!haystack.trim()) return [];

  const matched = new Set<EngineId>();
  for (const matcher of MATCHERS) {
    if (matcher.patterns.some((p) => p.test(haystack))) matched.add(matcher.engineId);
  }

  if (matched.size === 0 && /\bb58\b/i.test(haystack)) {
    matched.add('b58_gen1');
    matched.add('b58_gen2');
  }
  // A bare "VR30" reference fits both output variants.
  if (matched.has('vr30_luxe') && /\bvr30/i.test(haystack) && !/luxe|pure/i.test(haystack)) {
    matched.add('vr30_redsport');
  }

  return [...matched];
}

/** Keyword rules mapping a vendor's own wording onto Stage0's part categories. */
const CATEGORY_RULES: { category: PartCategory; patterns: RegExp[] }[] = [
  { category: 'tune', patterns: [/\btune|tuning|flash|calibrat|bootmod|\bmhd\b|\bxhp\b|\becu\b|\btcu\b|piggyback/i] },
  { category: 'downpipe', patterns: [/down ?pipe|\bdp\b|catless|catted|high ?flow ?cat|test ?pipe/i] },
  { category: 'intake', patterns: [/intake|air ?filter|\bcai\b|induction|air ?box|\bmaf\b/i] },
  {
    category: 'chargepipe_intercooler',
    patterns: [/charge ?pipe|inter ?cooler|\bfmic\b|boost ?pipe|\bcooler\b|heat ?exchanger|\bbov\b|diverter/i],
  },
  { category: 'fueling', patterns: [/fuel|injector|\bhpfp\b|\blpfp\b|flex ?fuel|ethanol|\be85\b|fuel ?pump/i] },
  { category: 'turbo', patterns: [/turbo|supercharger|\bbillet\b|compressor|manifold|wastegate/i] },
  { category: 'exhaust', patterns: [/exhaust|muffler|cat ?back|axle ?back|resonator|\btips?\b/i] },
  { category: 'drivetrain', patterns: [/clutch|transmission|differential|drive ?shaft|axle|\blsd\b|flywheel|mount/i] },
];

export function matchCategory(...texts: (string | null | undefined)[]): PartCategory | null {
  const haystack = texts.filter(Boolean).join(' ').toLowerCase();
  if (!haystack.trim()) return null;
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(haystack))) return rule.category;
  }
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
