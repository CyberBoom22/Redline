import { VendorConfig } from './types';

/**
 * Vendor definitions.
 *
 * ── Verify seeds before the first real run ──────────────────────────────────
 * Storefront URL schemes and CSS class names change without notice, and the
 * seeds/selectors below are starting points, not verified constants. Run
 * `npm run scrape:verify` once: it spends a handful of requests, reports
 * whether each seed returns 200, whether robots.txt permits it, and how many
 * product links the selector finds. Fix anything that reports zero, then run
 * the real scrape. Extraction leans on JSON-LD first, so the CSS selectors
 * only matter as a fallback.
 */

/** Overridable so the end-to-end test can run against a scratch directory. */
export const DATA_DIR = process.env.STAGE0_DATA_DIR ?? 'data/catalog';

export const VENDORS: VendorConfig[] = [
  {
    id: 'ecs',
    name: 'ECS Tuning',
    origin: 'https://www.ecstuning.com',
    enabled: true,
    budgetShare: 0.34,
    discoveryShare: 0.25,
    minDelayMs: 8_000,
    seeds: [
      { url: 'https://www.ecstuning.com/BMW-G20-M340i-B58/', label: 'G20 M340i (B58 Gen 2)', engineHint: ['b58_gen2'] },
      { url: 'https://www.ecstuning.com/BMW-F30-340i-B58/', label: 'F30 340i (B58 Gen 1)', engineHint: ['b58_gen1'] },
      { url: 'https://www.ecstuning.com/BMW-F22-M240i-B58/', label: 'F22 M240i (B58 Gen 1)', engineHint: ['b58_gen1'] },
      { url: 'https://www.ecstuning.com/BMW-G42-M240i-B58/', label: 'G42 M240i (B58 Gen 2)', engineHint: ['b58_gen2'] },
    ],
    productUrlPattern: '^https://www\\.ecstuning\\.com/b-[^/]+/[^/]+/[^/]+/?$',
    selectors: {
      productLink: 'a.product-name, a[href*="/b-"], .product-item a',
      nextPage: 'a.next, a[rel="next"], .pagination a[title="Next"]',
      name: 'h1.page-title, h1[itemprop="name"], h1',
      price: '.product-price, [data-price], .price',
      brand: '.product-brand, [itemprop="brand"]',
      sku: '.product-sku, [itemprop="sku"]',
      availability: '.stock-status, .availability',
      image: 'img.product-image, [itemprop="image"]',
      description: '.product-description, [itemprop="description"]',
      fitment: '.fitment, .vehicle-fitment, .product-fitment',
    },
  },
  {
    id: 'fcp',
    name: 'FCP Euro',
    origin: 'https://www.fcpeuro.com',
    enabled: true,
    budgetShare: 0.33,
    discoveryShare: 0.25,
    minDelayMs: 8_000,
    seeds: [
      { url: 'https://www.fcpeuro.com/BMW-parts/G20-340i-B58/', label: 'G20 340i (B58 Gen 2)', engineHint: ['b58_gen2'] },
      { url: 'https://www.fcpeuro.com/BMW-parts/F30-340i-B58/', label: 'F30 340i (B58 Gen 1)', engineHint: ['b58_gen1'] },
      { url: 'https://www.fcpeuro.com/BMW-parts/F22-M240i-B58/', label: 'F22 M240i (B58 Gen 1)', engineHint: ['b58_gen1'] },
    ],
    productUrlPattern: '^https://www\\.fcpeuro\\.com/products/[^/]+/?$',
    selectors: {
      productLink: 'a[href*="/products/"]',
      nextPage: 'a[rel="next"], .pagination__next',
      name: 'h1.product-title, h1',
      price: '.product-price, .price',
      brand: '.product-brand, [itemprop="brand"]',
      sku: '.product-sku, [itemprop="sku"]',
      availability: '.availability, .stock',
      image: '.product-image img',
      description: '.product-description',
      fitment: '.fitment-list, .vehicle-fitment',
    },
  },
  {
    id: 'z1',
    name: 'Z1 Motorsports',
    origin: 'https://www.z1motorsports.com',
    enabled: true,
    budgetShare: 0.33,
    discoveryShare: 0.25,
    minDelayMs: 8_000,
    // ECS and FCP are European-only retailers and carry no Infiniti/Nissan
    // parts, so VQ/VR coverage comes from Z1 Motorsports instead.
    seeds: [
      { url: 'https://www.z1motorsports.com/q50-q60-30t/', label: 'Q50/Q60 3.0t (VR30)', engineHint: ['vr30_luxe', 'vr30_redsport'] },
      { url: 'https://www.z1motorsports.com/370z/', label: '370Z (VQ37VHR)', engineHint: ['vq37vhr'] },
      { url: 'https://www.z1motorsports.com/g37/', label: 'G37 (VQ37VHR)', engineHint: ['vq37vhr'] },
    ],
    productUrlPattern: '^https://www\\.z1motorsports\\.com/.+-p-\\d+\\.html$',
    selectors: {
      productLink: 'a[href*="-p-"], .product a',
      nextPage: 'a[rel="next"], .pagination-next a',
      name: 'h1.product-name, h1',
      price: '.product-price, .price-value, .price',
      brand: '.product-manufacturer, [itemprop="brand"]',
      sku: '.product-sku, [itemprop="sku"]',
      availability: '.availability, .stock-status',
      image: '.product-image img',
      description: '.product-description, #tab-description',
      fitment: '.fitment, .vehicle-application',
    },
  },
];

export function enabledVendors(): VendorConfig[] {
  return VENDORS.filter((v) => v.enabled);
}
