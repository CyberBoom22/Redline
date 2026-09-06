import * as cheerio from 'cheerio';
import { VendorSelectors } from './types';

export interface RawProduct {
  name: string | null;
  brand: string | null;
  sku: string | null;
  mpn: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  imageUrl: string | null;
  description: string | null;
  category: string | null;
  fitmentText: string | null;
  via: 'json-ld' | 'microdata' | 'og' | 'selector';
}

type Json = Record<string, unknown>;

/**
 * Extraction runs cheapest-and-most-reliable first: JSON-LD Product blocks
 * (which all three storefronts emit for SEO), then schema.org microdata, then
 * Open Graph, then per-vendor CSS selectors. Selectors are the only brittle
 * layer, so they sit last and are config-driven.
 */
export function extractProduct(html: string, selectors: VendorSelectors): RawProduct | null {
  const $ = cheerio.load(html);
  const candidates = [
    () => fromJsonLd($),
    () => fromMicrodata($),
    () => fromOpenGraph($),
    () => fromSelectors($, selectors),
  ];

  let best: RawProduct | null = null;
  for (const attempt of candidates) {
    const found = attempt();
    if (!found) continue;
    best = best ? mergeProduct(best, found) : found;
    // A name and a price is enough to stop climbing down the fallback chain.
    if (best.name && best.price !== null) break;
  }

  if (best && !best.fitmentText && selectors.fitment) {
    best.fitmentText = text($(selectors.fitment)) ?? null;
  }
  return best && best.name ? best : null;
}

/** Product links on a listing page, absolutised and de-duplicated. */
export function extractLinks(html: string, baseUrl: string, selector: string, pattern: string): string[] {
  const $ = cheerio.load(html);
  const re = new RegExp(pattern);
  const seen = new Set<string>();

  $(selector).each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      return;
    }
    // Anchors come from third-party HTML; only http(s) is ever followed.
    if (abs.startsWith('http://') || abs.startsWith('https://')) {
      const clean = abs.split('#')[0];
      if (re.test(clean)) seen.add(clean);
    }
  });

  return [...seen];
}

export function extractNextPage(html: string, baseUrl: string, selector?: string): string | null {
  if (!selector) return null;
  const $ = cheerio.load(html);
  const href = $(selector).first().attr('href');
  if (!href) return null;
  try {
    const abs = new URL(href, baseUrl);
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return null;
    return abs.toString();
  } catch {
    return null;
  }
}

function fromJsonLd($: cheerio.CheerioAPI): RawProduct | null {
  const blocks: Json[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      collectNodes(parsed, blocks);
    } catch {
      // Storefronts ship malformed JSON-LD often enough that this is expected.
    }
  });

  const product = blocks.find((node) => typeIncludes(node['@type'], 'Product'));
  if (!product) return null;

  const offer = firstOffer(product['offers']);
  const brand = product['brand'];

  return {
    name: str(product['name']),
    brand: typeof brand === 'object' && brand ? str((brand as Json)['name']) : str(brand),
    sku: str(product['sku']),
    mpn: str(product['mpn']),
    price: offer ? num(offer['price'] ?? offer['lowPrice']) : null,
    currency: offer ? str(offer['priceCurrency']) : null,
    availability: offer ? shortenAvailability(str(offer['availability'])) : null,
    imageUrl: firstImage(product['image']),
    description: str(product['description']),
    category: str(product['category']),
    fitmentText: null,
    via: 'json-ld',
  };
}

function fromMicrodata($: cheerio.CheerioAPI): RawProduct | null {
  const scope = $('[itemtype$="schema.org/Product"]').first();
  if (!scope.length) return null;
  const prop = (name: string) => {
    const el = scope.find(`[itemprop="${name}"]`).first();
    if (!el.length) return null;
    return el.attr('content') ?? el.attr('href') ?? text(el);
  };
  const price = prop('price');
  return {
    name: prop('name'),
    brand: prop('brand'),
    sku: prop('sku'),
    mpn: prop('mpn'),
    price: price ? parsePrice(price) : null,
    currency: prop('priceCurrency'),
    availability: shortenAvailability(prop('availability')),
    imageUrl: prop('image'),
    description: prop('description'),
    category: prop('category'),
    fitmentText: null,
    via: 'microdata',
  };
}

function fromOpenGraph($: cheerio.CheerioAPI): RawProduct | null {
  const meta = (property: string) =>
    $(`meta[property="${property}"], meta[name="${property}"]`).first().attr('content') ?? null;
  const name = meta('og:title');
  if (!name) return null;
  const price = meta('product:price:amount') ?? meta('og:price:amount');
  return {
    name,
    brand: meta('product:brand') ?? null,
    sku: meta('product:retailer_item_id') ?? null,
    mpn: null,
    price: price ? parsePrice(price) : null,
    currency: meta('product:price:currency') ?? meta('og:price:currency'),
    availability: shortenAvailability(meta('product:availability')),
    imageUrl: meta('og:image'),
    description: meta('og:description'),
    category: null,
    fitmentText: null,
    via: 'og',
  };
}

function fromSelectors($: cheerio.CheerioAPI, s: VendorSelectors): RawProduct | null {
  const name = s.name ? text($(s.name).first()) : null;
  if (!name) return null;
  const priceText = s.price ? text($(s.price).first()) : null;
  return {
    name,
    brand: s.brand ? text($(s.brand).first()) : null,
    sku: s.sku ? text($(s.sku).first()) : null,
    mpn: null,
    price: priceText ? parsePrice(priceText) : null,
    currency: null,
    availability: s.availability ? text($(s.availability).first()) : null,
    imageUrl: s.image ? $(s.image).first().attr('src') ?? null : null,
    description: s.description ? text($(s.description).first()) : null,
    category: null,
    fitmentText: s.fitment ? text($(s.fitment)) : null,
    via: 'selector',
  };
}

/** Fill gaps in `base` from `extra` without overwriting anything already found. */
function mergeProduct(base: RawProduct, extra: RawProduct): RawProduct {
  const out = { ...base };
  for (const key of Object.keys(extra) as (keyof RawProduct)[]) {
    if (key === 'via') continue;
    if (out[key] === null || out[key] === undefined) {
      (out as Record<string, unknown>)[key] = extra[key];
    }
  }
  return out;
}

/** Walk @graph / arrays so nested Product nodes are found too. */
function collectNodes(value: unknown, out: Json[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const node = value as Json;
  out.push(node);
  if ('@graph' in node) collectNodes(node['@graph'], out);
}

function typeIncludes(type: unknown, wanted: string): boolean {
  if (typeof type === 'string') return type === wanted || type.endsWith(`/${wanted}`);
  if (Array.isArray(type)) return type.some((t) => typeIncludes(t, wanted));
  return false;
}

function firstOffer(offers: unknown): Json | null {
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const found = firstOffer(offer);
      if (found) return found;
    }
    return null;
  }
  if (!offers || typeof offers !== 'object') return null;
  const node = offers as Json;
  // AggregateOffer wraps the real offers one level down.
  if ('offers' in node && !('price' in node) && !('lowPrice' in node)) return firstOffer(node['offers']);
  return node;
}

function firstImage(image: unknown): string | null {
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return firstImage(image[0]);
  if (image && typeof image === 'object') return str((image as Json)['url']);
  return null;
}

function shortenAvailability(value: string | null): string | null {
  if (!value) return null;
  // "https://schema.org/InStock" -> "InStock"
  return value.replace(/^.*\//, '').trim() || null;
}

export function parsePrice(value: string): number | null {
  // Take the first money-shaped token; strips currency symbols and thousands separators.
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return parsePrice(value);
  return null;
}

function text(el: cheerio.Cheerio<any>): string | null {
  if (!el || !el.length) return null;
  const value = el.text().replace(/\s+/g, ' ').trim();
  return value || null;
}
