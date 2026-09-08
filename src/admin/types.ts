/** Rows the admin report reads. Written by the scraper's sync job, never by the browser. */

export interface ScrapeRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger: string;
  requests_used: number;
  request_limit: number;
  by_platform: Record<string, number>;
  by_vendor: Record<string, number>;
  not_modified: number;
  discovered: number;
  parts_created: number;
  parts_updated: number;
  parts_unchanged: number;
  price_changes: number;
  gone: number;
  errors: number;
  stopped_reason: string | null;
  duration_seconds: number | null;
  github_run_url: string | null;
}

export interface ScrapeEvent {
  id: number;
  run_id: string;
  vendor_id: string;
  url: string;
  kind: string;
  status: number | null;
  outcome: string;
  part_id: string | null;
  old_price: number | null;
  new_price: number | null;
  message: string | null;
  at: string;
}
