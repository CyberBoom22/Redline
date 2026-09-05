import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config';
import { Store } from './state';
import { CatalogPart } from './types';
import { EngineId } from '../../src/types';

/**
 * Writes the generated TypeScript module the app imports.
 *
 * Scraped data covers only what a storefront actually publishes — price, stock,
 * brand, fitment. The editorial fields in `Part` (whpGain, verdict, labor cost,
 * care instructions) are judgement calls the scraper cannot make, so the
 * catalog stays a separate dataset that the curated `ALL_PARTS` can reference
 * by SKU rather than something that overwrites it.
 */
export async function emit(outFile = 'src/data/scrapedCatalog.ts'): Promise<number> {
  const store = await Store.load(DATA_DIR);
  const parts = store.allParts
    .filter((p) => p.engineIds.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  const byEngine = countByEngine(parts);
  const generatedAt = new Date().toISOString();

  const source = `// GENERATED FILE — do not edit by hand.
// Written by scripts/scraper (npm run scrape:emit). Last generated ${generatedAt}.
//
// Vendor catalog data: pricing, availability and fitment scraped from retailer
// product pages. Editorial fields (whpGain, verdict, labor) live in parts.ts.

import { EngineId, PartCategory } from '../types';

export interface CatalogListing {
  id: string;
  vendorId: 'ecs' | 'fcp' | 'z1';
  vendorName: string;
  url: string;
  name: string;
  brand: string | null;
  sku: string | null;
  price: number | null;
  currency: string;
  availability: string | null;
  imageUrl: string | null;
  category: PartCategory | null;
  engineIds: EngineId[];
  lastSeenAt: string;
}

export const CATALOG_GENERATED_AT = '${generatedAt}';

export const SCRAPED_CATALOG: CatalogListing[] = ${JSON.stringify(parts.map(toListing), null, 2)};

export function getCatalogForEngine(engineId: EngineId): CatalogListing[] {
  return SCRAPED_CATALOG.filter((listing) => listing.engineIds.includes(engineId));
}

/** Vendor listings that plausibly match a curated part, by SKU then by name. */
export function getListingsForSku(sku: string): CatalogListing[] {
  const needle = sku.toLowerCase();
  return SCRAPED_CATALOG.filter(
    (listing) =>
      listing.sku?.toLowerCase() === needle || listing.name.toLowerCase().includes(needle),
  );
}
`;

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, source, 'utf8');

  console.log(`Wrote ${parts.length} listings to ${outFile}`);
  for (const [engine, count] of Object.entries(byEngine)) {
    console.log(`  ${engine.padEnd(16)} ${count}`);
  }
  const skipped = store.allParts.length - parts.length;
  if (skipped > 0) {
    console.log(`  (${skipped} scraped product(s) omitted — no engine fitment could be determined)`);
  }
  return parts.length;
}

function toListing(part: CatalogPart) {
  return {
    id: part.id,
    vendorId: part.vendorId,
    vendorName: part.vendorName,
    url: part.url,
    name: part.name,
    brand: part.brand,
    sku: part.sku,
    price: part.price,
    currency: part.currency,
    availability: part.availability,
    imageUrl: part.imageUrl,
    category: part.category,
    engineIds: part.engineIds,
    lastSeenAt: part.lastSeenAt,
  };
}

function countByEngine(parts: CatalogPart[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of parts) {
    for (const engineId of part.engineIds as EngineId[]) {
      out[engineId] = (out[engineId] ?? 0) + 1;
    }
  }
  return out;
}
