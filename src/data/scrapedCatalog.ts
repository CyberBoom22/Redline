// GENERATED FILE — do not edit by hand.
// Written by scripts/scraper (npm run scrape:emit). Last generated 2026-09-08T13:37:01.256Z.
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

export const CATALOG_GENERATED_AT = '2026-09-08T13:37:01.256Z';

export const SCRAPED_CATALOG: CatalogListing[] = [];

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
