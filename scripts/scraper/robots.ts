/**
 * Minimal robots.txt parser and matcher (RFC 9309 shape).
 *
 * We only need three things: whether a path is allowed for our agent, the
 * Crawl-delay it asks for, and any Sitemap hints. Group selection follows the
 * spec: the most specific matching User-agent group wins, falling back to `*`.
 */

export interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelayMs: number | null;
  sitemaps: string[];
}

const EMPTY: RobotsRules = { allow: [], disallow: [], crawlDelayMs: null, sitemaps: [] };

/**
 * A robots.txt we could not fetch is treated as "allow nothing" when the fetch
 * failed outright, and "allow everything" on a 404. That is the conservative
 * reading: a 404 means no restrictions were published, a 5xx or timeout means
 * we do not know, so we stay off the site.
 */
export function parseRobots(body: string, userAgent: string): RobotsRules {
  const lines = body.split(/\r?\n/);
  const groups: { agents: string[]; rules: RobotsRules }[] = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastLineWasAgent = false;
  const sitemaps: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'sitemap') {
      sitemaps.push(value);
      continue;
    }

    if (field === 'user-agent') {
      // Consecutive User-agent lines share one group.
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [], crawlDelayMs: null, sitemaps: [] } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (!current) continue;

    if (field === 'allow') current.rules.allow.push(value);
    else if (field === 'disallow') current.rules.disallow.push(value);
    else if (field === 'crawl-delay') {
      const seconds = Number.parseFloat(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.rules.crawlDelayMs = seconds * 1000;
    }
  }

  const ua = userAgent.toLowerCase();
  // Longest matching agent token wins; `*` is the fallback group.
  let best: { agents: string[]; rules: RobotsRules } | null = null;
  let bestLen = -1;
  let wildcard: RobotsRules | null = null;

  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === '*') {
        wildcard = mergeGroup(wildcard, group.rules);
      } else if (ua.includes(agent) && agent.length > bestLen) {
        best = group;
        bestLen = agent.length;
      }
    }
  }

  const chosen = best ? best.rules : wildcard ?? EMPTY;
  return { ...chosen, sitemaps };
}

function mergeGroup(into: RobotsRules | null, add: RobotsRules): RobotsRules {
  if (!into) return { ...add, allow: [...add.allow], disallow: [...add.disallow], sitemaps: [] };
  return {
    allow: [...into.allow, ...add.allow],
    disallow: [...into.disallow, ...add.disallow],
    crawlDelayMs: into.crawlDelayMs ?? add.crawlDelayMs,
    sitemaps: [],
  };
}

/** Translate a robots path pattern (supports `*` and `$`) into a regex. */
function patternToRegex(pattern: string): RegExp {
  let out = '^';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') out += '.*';
    else if (ch === '$' && i === pattern.length - 1) out += '$';
    else out += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(out);
}

/**
 * Longest-match wins; on an exact tie Allow beats Disallow, per the spec.
 * An empty Disallow value means "allow everything" and is ignored here.
 */
export function isAllowed(rules: RobotsRules, url: string): boolean {
  const path = toPath(url);

  let allowLen = -1;
  for (const rule of rules.allow) {
    if (rule && patternToRegex(rule).test(path)) allowLen = Math.max(allowLen, rule.length);
  }

  let disallowLen = -1;
  for (const rule of rules.disallow) {
    if (rule && patternToRegex(rule).test(path)) disallowLen = Math.max(disallowLen, rule.length);
  }

  if (disallowLen === -1) return true;
  return allowLen >= disallowLen;
}

function toPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}
