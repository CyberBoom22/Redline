import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertOctagon, ArrowRight, Ban, CheckCircle2, ChevronRight, Clock,
  Database, ExternalLink, Gauge, Loader2, LogOut, RefreshCw, ShieldAlert,
} from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { ScrapeEvent, ScrapeRun } from './types';

const PLATFORM_LABELS: Record<string, string> = { b58: 'B58', vq_vr: 'VQ/VR' };

/** `blocked` and `budget` are the two an operator needs to notice. */
const STOP_REASON_STYLE: Record<string, string> = {
  blocked: 'bg-red-950/90 text-red-300 border-red-700',
  budget: 'bg-amber-950/90 text-amber-300 border-amber-700',
  error: 'bg-red-950/90 text-red-300 border-red-700',
  queue_empty: 'bg-slate-800 text-slate-400 border-slate-700',
  completed: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
};

const OUTCOME_STYLE: Record<string, string> = {
  price_changed: 'text-amber-300',
  created: 'text-emerald-400',
  updated: 'text-sky-300',
  unchanged: 'text-slate-500',
  gone: 'text-red-400',
  error: 'text-red-400',
  not_modified: 'text-slate-500',
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-600 selection:text-white">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center ring-1 ring-red-500/30">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono font-bold text-sm uppercase tracking-wider text-white">
                Scrape Report
              </div>
              <p className="text-[11px] text-slate-500 font-mono">{session?.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadRuns()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-mono uppercase tracking-widest transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-800 text-slate-300 hover:text-red-300 text-[11px] font-mono uppercase tracking-widest transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {runsError && (
          <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/70 rounded-xl px-4 py-3">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{runsError}</p>
          </div>
        )}

        {runs === null ? (
          <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-mono text-xs uppercase tracking-widest">Loading runs</span>
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center mx-auto">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-slate-200">
              No scrape runs recorded yet
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              The scraper runs in GitHub Actions and writes to <code className="font-mono text-slate-300">data/catalog/</code>.
              Once the sync job that pushes those results into Supabase is in place, its runs will appear here.
            </p>
          </div>
        ) : (
          <>
            <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
                <Activity className="w-4 h-4 text-red-500" />
                <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-slate-100">
                  Runs
                </h2>
                <span className="text-[10px] font-mono text-slate-500">{runs.length} recorded</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono uppercase tracking-widest text-slate-500 border-b border-slate-800">
                      <th className="text-left px-4 py-2.5 font-semibold">Started</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Trigger</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Duration</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Requests</th>
                      <th className="text-left px-3 py-2.5 font-semibold">By platform</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Parts +/~/=/−</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Price</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Errors</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Stopped</th>
                      <th className="px-2 py-2.5"></th>
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
                          className={`border-b border-slate-850/60 cursor-pointer transition-colors ${
                            selected ? 'bg-red-950/20' : 'hover:bg-slate-850/40'
                          }`}
                        >
                          <td className="px-4 py-2.5 font-mono text-slate-200 whitespace-nowrap">
                            {formatWhen(run.started_at)}
                            <span className="text-slate-600"> → </span>
                            <span className="text-slate-400">{formatWhen(run.finished_at)}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-400">{run.trigger}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-300 tabular-nums">
                            <Clock className="w-3 h-3 inline mr-1 text-slate-600" />
                            {formatDuration(run.duration_seconds)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className={pct >= 95 ? 'text-amber-300' : 'text-slate-200'}>
                              {run.requests_used}
                            </span>
                            <span className="text-slate-600">/{run.request_limit}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">
                            {Object.keys(run.by_platform ?? {}).length === 0 ? (
                              <span className="text-slate-600">—</span>
                            ) : (
                              Object.entries(run.by_platform).map(([k, v]) => (
                                <span key={k} className="mr-2">
                                  <span className="text-slate-500">{PLATFORM_LABELS[k] ?? k}</span>{' '}
                                  <span className="text-slate-200 tabular-nums">{String(v)}</span>
                                </span>
                              ))
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="text-emerald-400">{run.parts_created}</span>
                            <span className="text-slate-700">/</span>
                            <span className="text-sky-300">{run.parts_updated}</span>
                            <span className="text-slate-700">/</span>
                            <span className="text-slate-500">{run.parts_unchanged}</span>
                            <span className="text-slate-700">/</span>
                            <span className="text-red-400">{run.gone}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-amber-300">
                            {run.price_changes}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                            <span className={run.errors > 0 ? 'text-red-400' : 'text-slate-600'}>
                              {run.errors}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                STOP_REASON_STYLE[stop] ?? 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {stop === 'blocked' && <Ban className="w-3 h-3" />}
                              {stop === 'budget' && <AlertOctagon className="w-3 h-3" />}
                              {stop === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                              {stop}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-slate-600">
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${selected ? 'rotate-90 text-red-400' : ''}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedRun && (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-800">
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-slate-100">
                    Events
                  </h2>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatWhen(selectedRun.started_at)} · {selectedRun.trigger}
                  </span>
                  {selectedRun.github_run_url && (
                    <a
                      href={selectedRun.github_run_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-red-300 inline-flex items-center gap-1"
                    >
                      Actions run <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    {['all', ...outcomes].map((outcome) => (
                      <button
                        key={outcome}
                        onClick={() => setOutcomeFilter(outcome)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                          outcomeFilter === outcome
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {outcome}
                        {outcome !== 'all' && events && (
                          <span className="ml-1 opacity-60">
                            {events.filter((e) => e.outcome === outcome).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {eventsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-mono text-xs uppercase tracking-widest">Loading events</span>
                  </div>
                ) : visibleEvents.length === 0 ? (
                  <p className="px-5 py-10 text-center text-xs text-slate-500 font-mono uppercase tracking-widest">
                    No events recorded for this run
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] font-mono uppercase tracking-widest text-slate-500 border-b border-slate-800">
                          <th className="text-left px-4 py-2.5 font-semibold">Vendor</th>
                          <th className="text-left px-3 py-2.5 font-semibold">URL</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Kind</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Status</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Outcome</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEvents.map((event) => (
                          <tr key={event.id} className="border-b border-slate-850/60 hover:bg-slate-850/40">
                            <td className="px-4 py-2 font-mono text-slate-300 whitespace-nowrap">
                              {event.vendor_id}
                            </td>
                            <td className="px-3 py-2 max-w-md">
                              <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-slate-400 hover:text-red-300 truncate block"
                                title={event.url}
                              >
                                {event.url}
                              </a>
                              {event.message && (
                                <span className="block text-[10px] text-slate-600 truncate">{event.message}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-500">{event.kind}</td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">
                              <span
                                className={
                                  event.status && event.status >= 400 ? 'text-red-400' : 'text-slate-400'
                                }
                              >
                                {event.status ?? '—'}
                              </span>
                            </td>
                            <td
                              className={`px-3 py-2 font-mono ${OUTCOME_STYLE[event.outcome] ?? 'text-slate-300'}`}
                            >
                              {event.outcome}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {event.old_price === null && event.new_price === null ? (
                                <span className="text-slate-700">—</span>
                              ) : (
                                <span>
                                  <span className="text-slate-500">{formatPrice(event.old_price)}</span>
                                  <ArrowRight className="w-3 h-3 inline mx-1 text-slate-600" />
                                  <span className="text-amber-300">{formatPrice(event.new_price)}</span>
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
