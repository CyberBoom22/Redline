import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertOctagon, ArrowRight, Ban, CheckCircle2, ChevronRight, Clock,
  Database, ExternalLink, Loader2, LogOut, RefreshCw, ShieldAlert,
} from 'lucide-react';
import { Logo } from '../components/billet/Logo';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { ScrapeEvent, ScrapeRun } from './types';

const PLATFORM_LABELS: Record<string, string> = { b58: 'B58', vq_vr: 'VQ/VR' };

/** `blocked` and `budget` are the two an operator needs to notice. */
const STOP_REASON_STYLE: Record<string, string> = {
  blocked: 'chip chip-accent',
  budget: 'chip text-accent-bright',
  error: 'chip chip-accent',
  queue_empty: 'chip text-dark-muted',
  completed: 'chip text-on-dark',
};

const OUTCOME_STYLE: Record<string, string> = {
  price_changed: 'text-on-dark font-bold',
  created: 'text-on-dark',
  updated: 'text-on-dark',
  unchanged: 'text-dark-muted',
  gone: 'text-accent-bright',
  error: 'text-accent-bright font-bold',
  not_modified: 'text-dark-muted',
};

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(value: number | null): string {
  return value === null || value === undefined ? '—' : `$${Number(value).toFixed(2)}`;
}

export const AdminReport: React.FC = () => {
  const { signOut, session } = useAuth();

  const [runs, setRuns] = useState<ScrapeRun[] | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const [events, setEvents] = useState<ScrapeEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const loadRuns = useCallback(async () => {
    setRunsError(null);
    const { data, error } = await requireSupabase()
      .from('scrape_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) {
      setRunsError(error.message);
      setRuns([]);
      return;
    }
    setRuns((data ?? []) as ScrapeRun[]);
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setEvents(null);
      return;
    }
    let cancelled = false;
    setEventsLoading(true);
    setOutcomeFilter('all');
    requireSupabase()
      .from('scrape_events')
      .select('*')
      .eq('run_id', selectedRunId)
      .order('at', { ascending: true })
      .limit(1000)
      .then(({ data, error }) => {
        if (cancelled) return;
        setEvents(error ? [] : ((data ?? []) as ScrapeEvent[]));
        setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  const outcomes = useMemo(() => {
    if (!events) return [];
    return [...new Set(events.map((e) => e.outcome))].sort();
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (!events) return [];
    return outcomeFilter === 'all' ? events : events.filter((e) => e.outcome === outcomeFilter);
  }, [events, outcomeFilter]);

  const selectedRun = runs?.find((r) => r.id === selectedRunId) ?? null;

  const th = 'label-ui px-3 py-3 font-normal text-dark-muted';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-ink text-on-dark">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <Logo />
              <span className="label-ui text-dark-muted">Scrape report</span>
            </div>
            <p className="mt-1 truncate text-[14px] text-dark-muted">{session?.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void loadRuns()} className="btn btn-ghost-dark btn-sm">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
            <button onClick={() => void signOut()} className="btn btn-ghost-dark btn-sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="sr-only">Scrape report</h1>

        {runsError && (
          <div role="alert" className="plate flex items-start gap-2 border border-accent px-4 py-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
            <p className="text-[15px] text-text-2">{runsError}</p>
          </div>
        )}

        {runs === null ? (
          <div className="flex items-center justify-center gap-2 py-24 text-text-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="label-ui">Loading runs</span>
          </div>
        ) : runs.length === 0 ? (
          <div className="plate space-y-3 p-10 text-center">
            <Database className="mx-auto h-6 w-6 text-text-3" aria-hidden="true" />
            <h2 className="h-section etch text-ink">No scrape runs recorded yet</h2>
            <p className="mx-auto max-w-md text-[16px] text-text-2">
              The scraper runs in GitHub Actions and writes to <code className="font-semibold text-ink">data/catalog/</code>.
              Once the sync job that pushes those results into Supabase is in place, its runs will appear here.
            </p>
          </div>
        ) : (
          <>
            <section className="panel-dark overflow-hidden" aria-labelledby="runs-title">
              <div className="flex flex-wrap items-baseline gap-3 border-b border-dark-border px-5 py-4">
                <Activity className="h-4 w-4 self-center text-dark-muted" aria-hidden="true" />
                <h2 id="runs-title" className="h-section">Runs</h2>
                <span className="label-ui text-dark-muted">{runs.length} recorded</span>
              </div>

              {/* Wide table scrolls inside its own container. */}
              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className={`${th} pl-5 text-left`}>Started</th>
                      <th className={`${th} text-left`}>Trigger</th>
                      <th className={`${th} text-right`}>Duration</th>
                      <th className={`${th} text-right`}>Requests</th>
                      <th className={`${th} text-left`}>By platform</th>
                      <th className={`${th} text-right`}>Parts +/~/=/−</th>
                      <th className={`${th} text-right`}>Price</th>
                      <th className={`${th} text-right`}>Errors</th>
                      <th className={`${th} text-left`}>Stopped</th>
                      <th className="px-2 py-3"><span className="sr-only">Details</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const selected = run.id === selectedRunId;
                      const pct = run.request_limit > 0
                        ? Math.round((run.requests_used / run.request_limit) * 100)
                        : 0;
                      const stop = run.stopped_reason ?? 'completed';
                      return (
                        <tr
                          key={run.id}
                          onClick={() => setSelectedRunId(selected ? null : run.id)}
                          className={`cursor-pointer border-b border-dark-border transition-colors ${
                            selected ? 'bg-[#2a1216]' : 'hover:bg-[#1e2125]'
                          }`}
                        >
                          <td className="whitespace-nowrap py-2.5 pl-5 pr-3 text-on-dark">
                            {formatWhen(run.started_at)}
                            <span className="text-dark-muted"> → </span>
                            <span className="text-dark-muted">{formatWhen(run.finished_at)}</span>
                          </td>
                          <td className="px-3 py-2.5 text-dark-muted">{run.trigger}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-on-dark">
                            <Clock className="mr-1 inline h-3.5 w-3.5 text-dark-muted" aria-hidden="true" />
                            {formatDuration(run.duration_seconds)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                            <span className={pct >= 95 ? 'font-bold text-accent-bright' : 'text-on-dark'}>
                              {run.requests_used}
                            </span>
                            <span className="text-dark-muted">/{run.request_limit}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-dark-muted">
                            {Object.keys(run.by_platform ?? {}).length === 0 ? (
                              <span>—</span>
                            ) : (
                              Object.entries(run.by_platform).map(([k, v]) => (
                                <span key={k} className="mr-2">
                                  <span>{PLATFORM_LABELS[k] ?? k}</span>{' '}
                                  <span className="tabular-nums text-on-dark">{String(v)}</span>
                                </span>
                              ))
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                            <span className="text-on-dark">{run.parts_created}</span>
                            <span className="text-dark-muted">/</span>
                            <span className="text-on-dark">{run.parts_updated}</span>
                            <span className="text-dark-muted">/</span>
                            <span className="text-dark-muted">{run.parts_unchanged}</span>
                            <span className="text-dark-muted">/</span>
                            <span className="text-accent-bright">{run.gone}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-on-dark">
                            {run.price_changes}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            <span className={run.errors > 0 ? 'font-bold text-accent-bright' : 'text-dark-muted'}>
                              {run.errors}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={STOP_REASON_STYLE[stop] ?? 'chip text-dark-muted'}>
                              {stop === 'blocked' && <Ban className="h-3 w-3" aria-hidden="true" />}
                              {stop === 'budget' && <AlertOctagon className="h-3 w-3" aria-hidden="true" />}
                              {stop === 'completed' && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                              {stop}
                            </span>
                          </td>
                          <td className="px-1 py-1 text-dark-muted">
                            {/* The click bubbles to the row; this button gives
                                keyboard and screen-reader users the same toggle. */}
                            <button
                              type="button"
                              aria-expanded={selected}
                              aria-label={`${selected ? 'Hide' : 'Show'} events for run started ${formatWhen(run.started_at)}`}
                              className="icon-btn hover:text-on-dark"
                            >
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${selected ? 'rotate-90 text-accent-bright' : ''}`}
                                aria-hidden="true"
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedRun && (
              <section className="panel-dark overflow-hidden" aria-labelledby="events-title">
                <div className="flex flex-wrap items-center gap-3 border-b border-dark-border px-5 py-4">
                  <h2 id="events-title" className="h-section">Events</h2>
                  <span className="label-ui text-dark-muted">
                    {formatWhen(selectedRun.started_at)} · {selectedRun.trigger}
                  </span>
                  {selectedRun.github_run_url && (
                    <a
                      href={selectedRun.github_run_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link text-[14px] text-dark-muted hover:text-on-dark"
                    >
                      Actions run <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}

                  <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
                    {['all', ...outcomes].map((outcome) => (
                      <button
                        key={outcome}
                        onClick={() => setOutcomeFilter(outcome)}
                        aria-pressed={outcomeFilter === outcome}
                        className="toggle toggle-dark text-[13px] uppercase tracking-[1px]"
                      >
                        {outcome}
                        {outcome !== 'all' && events && (
                          <span className="tabular-nums">
                            {events.filter((e) => e.outcome === outcome).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {eventsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-dark-muted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span className="label-ui">Loading events</span>
                  </div>
                ) : visibleEvents.length === 0 ? (
                  <p className="label-ui px-5 py-10 text-center text-dark-muted">
                    No events recorded for this run
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[14px]">
                      <thead>
                        <tr className="border-b border-dark-border">
                          <th className={`${th} pl-5 text-left`}>Vendor</th>
                          <th className={`${th} text-left`}>URL</th>
                          <th className={`${th} text-left`}>Kind</th>
                          <th className={`${th} text-right`}>Status</th>
                          <th className={`${th} text-left`}>Outcome</th>
                          <th className={`${th} text-right`}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEvents.map((event) => (
                          <tr key={event.id} className="border-b border-dark-border hover:bg-[#1e2125]">
                            <td className="whitespace-nowrap py-2 pl-5 pr-3 text-on-dark">
                              {event.vendor_id}
                            </td>
                            <td className="max-w-md px-3 py-2">
                              <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-dark-muted underline underline-offset-2 hover:text-on-dark"
                                title={event.url}
                              >
                                {event.url}
                              </a>
                              {event.message && (
                                <span className="block truncate text-[13px] text-dark-muted">{event.message}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-dark-muted">{event.kind}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <span
                                className={
                                  event.status && event.status >= 400 ? 'font-bold text-accent-bright' : 'text-dark-muted'
                                }
                              >
                                {event.status ?? '—'}
                              </span>
                            </td>
                            <td className={`px-3 py-2 ${OUTCOME_STYLE[event.outcome] ?? 'text-on-dark'}`}>
                              {event.outcome}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                              {event.old_price === null && event.new_price === null ? (
                                <span className="text-dark-muted">—</span>
                              ) : (
                                <span>
                                  <span className="text-dark-muted">{formatPrice(event.old_price)}</span>
                                  <ArrowRight className="mx-1 inline h-3 w-3 text-dark-muted" aria-hidden="true" />
                                  <span className="font-bold text-on-dark">{formatPrice(event.new_price)}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};
