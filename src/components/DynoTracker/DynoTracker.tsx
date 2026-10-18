import React, { useEffect, useState } from 'react';
import { VehicleSelection, UserDynoRun } from '../../types';
import { generateDynoCurveData } from '../../data/platforms';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Plus, Calendar, Loader2, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalBar } from '../billet/ModalBar';
import { PageHeader } from '../billet/PageHeader';
import { useMember } from '../../account/MemberProvider';
import type { AccountMode } from '../../account/AccountModal';
import { supabase } from '../../lib/supabase';
import {
  DYNO_LIMITS, DYNO_TYPES, fetchMemberRuns, insertMemberRuns, localDateKey, sanitizeRun, StoredDynoRun,
} from '../../lib/dynoRuns';
import {
  browserStorage, GUEST_DAILY_LIMIT, guestRunsLeft, readGuestState, recordGuestRun, restoreGuestRuns, takeGuestRuns,
} from '../../lib/guestDyno';

// Chart ink on the dark panel: greys plus the red, with anodized purple for
// the boost curve and its axis. Every series also carries its own dash
// pattern and the legend names it, so identity never rests on colour alone.
// All marks clear 3:1 against the ink face.
const CHART = {
  stock: '#8E9399',
  current: '#E4E7EA',
  target: '#F2545B',
  boost: '#9B6BFF',
  grid: '#33373D',
  axis: '#5E646B',
  tick: '#AEB4BA',
};

interface DynoTrackerProps {
  vehicle: VehicleSelection;
  stockWhp: number;
  stockWtq: number;
  projectedWhp: number;
  goalWhp: number;
  /** Open the register / log-in modal, with a line explaining why. */
  onRequestAccount: (mode: AccountMode, reason?: string) => void;
}

/** A run as the log list shows it; the sample baseline is not stored anywhere. */
type DisplayRun = Omit<UserDynoRun, 'dataPoints'> & { vehicleLabel?: string };

const LIMIT_REASON =
  "You've used today's free guest dyno log. Create a free account to log unlimited runs, " +
  'saved to your account. The run you already logged comes with you.';

export const DynoTracker: React.FC<DynoTrackerProps> = ({
  vehicle,
  stockWhp,
  stockWtq,
  projectedWhp,
  goalWhp,
  onRequestAccount
}) => {
  const member = useMember();
  const isMember = member.session !== null;
  const estimatedTargetWtq = Math.round(goalWhp * 1.05);
  const estimatedCurrentWtq = Math.round(projectedWhp * 1.02);

  const dynoCurveData = generateDynoCurveData(
    stockWhp,
    stockWtq,
    goalWhp,
    estimatedTargetWtq,
    projectedWhp,
    estimatedCurrentWtq
  );

  // Sample baseline shown to everyone. It is not stored and does not count
  // against the guest allowance.
  const sampleRun: DisplayRun = {
    id: 'run_1',
    date: '2026-05-12',
    title: 'Baseline Dynojet Run (Stock Tune & Filter)',
    dynoType: 'Dynojet',
    peakWhp: stockWhp + 10,
    peakWtq: stockWtq + 8,
    maxBoostPsi: 11.8,
    fuelType: '93 Octane',
    ambientTempF: 72,
    notes: 'Clean baseline pull on 4th gear. Smooth power delivery.'
  };

  // Guests: one run per day, kept in this browser (see lib/guestDyno.ts).
  const [guest, setGuest] = useState(() => readGuestState(browserStorage()));
  const guestLeft = guestRunsLeft(guest);
  // Members: unlimited runs in the dyno_runs table.
  const [memberRuns, setMemberRuns] = useState<StoredDynoRun[]>([]);
  const [memberStatus, setMemberStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  // On sign-in, move any guest runs into the account, then load the account's
  // runs. Taking the runs out of storage happens synchronously, before the
  // first await, so a re-run of this effect cannot insert them twice.
  const memberId = member.session?.user.id ?? null;
  useEffect(() => {
    if (!supabase || !memberId) {
      setMemberRuns([]);
      return;
    }
    const client = supabase;
    let cancelled = false;
    const store = browserStorage();
    const [pending, afterTake] = takeGuestRuns(store, readGuestState(store));
    setGuest(afterTake);
    setMemberStatus('loading');
    (async () => {
      try {
        await insertMemberRuns(client, pending);
      } catch {
        // Keep them in the browser and try again at the next sign-in.
        const restored = restoreGuestRuns(store, afterTake, pending);
        if (!cancelled) setGuest(restored);
      }
      try {
        const runs = await fetchMemberRuns(client);
        if (!cancelled) {
          setMemberRuns(runs);
          setMemberStatus('idle');
        }
      } catch {
        if (!cancelled) setMemberStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const dynoRuns: DisplayRun[] = [...(isMember ? memberRuns : guest.runs), sampleRun];

  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [runTitle, setRunTitle] = useState<string>('');
  const [peakWhp, setPeakWhp] = useState<number>(projectedWhp);
  const [peakWtq, setPeakWtq] = useState<number>(estimatedCurrentWtq);
  const [dynoType, setDynoType] = useState<UserDynoRun['dynoType']>('Dynojet');
  const [fuelType, setFuelType] = useState<string>('93 Octane');
  const [boostPsi] = useState<number>(18);
  const [notes, setNotes] = useState<string>('');

  const promptForAccount = () => {
    if (member.available) onRequestAccount('register', LIMIT_REASON);
    else setLimitReached(true);
  };

  const handleOpenLog = () => {
    if (!isMember && guestLeft === 0) {
      promptForAccount();
      return;
    }
    setSaveError(null);
    setShowLogModal(true);
  };

  const closeLogModal = () => {
    setShowLogModal(false);
    setRunTitle('');
    setNotes('');
  };

  const handleAddRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const run = sanitizeRun({
      id: `run_${Date.now()}`,
      date: localDateKey(),
      title: runTitle,
      dynoType,
      peakWhp,
      peakWtq,
      maxBoostPsi: boostPsi,
      fuelType,
      ambientTempF: 75,
      notes,
      engineId: vehicle.engineId,
      vehicleLabel: `${vehicle.year} ${vehicle.trim} (${vehicle.chassis})`
    });
    if (!run) return;

    if (isMember && supabase) {
      setSaving(true);
      setSaveError(null);
      try {
        const saved = await insertMemberRuns(supabase, [run]);
        setMemberRuns((prev) => [...saved, ...prev]);
        closeLogModal();
      } catch {
        setSaveError('Could not save the run to your account. Check your connection and try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (guestRunsLeft(guest) === 0) {
      closeLogModal();
      promptForAccount();
      return;
    }
    setGuest(recordGuestRun(browserStorage(), guest, run));
    closeLogModal();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Dyno visualizer"
        title="Interactive Dyno Graph Visualizer & Log"
        description="Real-time overlay comparison of stock horsepower/torque curves against projected build target and logged real-world dyno runs."
        actions={
          <button
            onClick={handleOpenLog}
            id="log-dyno-run-btn"
            className="btn btn-primary w-full whitespace-nowrap md:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Log Real Dyno Run</span>
          </button>
        }
      >
        {/* Access strip: what this visitor can log, and the way to log more. */}
        {!member.loading && (
          <div aria-live="polite" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {isMember ? (
              <p className="text-[16px] text-text-2">
                <span className="label-ui mr-2 text-anodize-deep">Member</span>
                Signed in as <strong className="text-ink">{member.session?.user.email}</strong>. Unlimited dyno logs, saved to your account.
                {memberStatus === 'loading' && <span className="ml-2 inline-flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your runs</span>}
                {memberStatus === 'error' && <span className="ml-2 font-semibold text-accent-deep">Could not load your saved runs. Refresh to try again.</span>}
              </p>
            ) : (
              <>
                <p className="text-[16px] text-text-2">
                  <span className="label-ui mr-2 text-anodize-deep">Guest</span>
                  {GUEST_DAILY_LIMIT} free dyno log per day:{' '}
                  <strong className="text-ink">
                    {guestLeft > 0 ? `${guestLeft} left today` : 'used today, resets at midnight'}
                  </strong>
                  .{' '}
                  {member.available
                    ? guest.runs.length > 0
                      ? 'Create a free account for unlimited logs. Your guest runs move into it when you sign in.'
                      : 'Create a free account for unlimited logs, saved to your account.'
                    : limitReached
                      ? 'Come back tomorrow to log another run.'
                      : ''}
                </p>
                {member.available && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => onRequestAccount('register')} className="btn btn-secondary btn-sm">
                      Create free account
                    </button>
                    <button type="button" onClick={() => onRequestAccount('login')} className="btn btn-outline btn-sm">
                      Log in
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </PageHeader>

      {/* Main Chart Card */}
      <section className="panel-dark space-y-4 p-5 sm:p-6" aria-labelledby="dyno-chart-title">
        <div className="flex flex-col gap-3 border-b border-dark-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="dyno-chart-title" className="flex flex-wrap items-baseline gap-x-3">
            <span className="label-ui text-accent-bright">Graph overlay:</span>
            <span className="font-semibold text-on-dark">{vehicle.trim} ({vehicle.chassis})</span>
          </h2>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]">
            <li className="flex items-center gap-2 text-dark-muted">
              <span aria-hidden="true" className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: CHART.stock }} />
              Stock ({stockWhp} WHP)
            </li>
            <li className="flex items-center gap-2 text-on-dark">
              <span aria-hidden="true" className="inline-block w-5 border-t-2" style={{ borderColor: CHART.current }} />
              Current Build ({projectedWhp} WHP)
            </li>
            <li className="flex items-center gap-2 font-bold text-on-dark">
              <span aria-hidden="true" className="inline-block w-5 border-t-[3px]" style={{ borderColor: CHART.target }} />
              Goal Target ({goalWhp} WHP)
            </li>
          </ul>
        </div>

        {/* Recharts Line Chart */}
        <div className="h-80 w-full pt-2 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dynoCurveData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="rpm" stroke={CHART.axis} tick={{ fill: CHART.tick, fontSize: 12 }} />
              <YAxis yAxisId="power" stroke={CHART.axis} tick={{ fill: CHART.tick, fontSize: 12 }} domain={[0, 'dataMax + 60']} />
              <YAxis yAxisId="boost" orientation="right" stroke={CHART.boost} tick={{ fill: CHART.boost, fontSize: 12 }} domain={[0, 30]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E2125',
                  borderColor: '#33373D',
                  borderRadius: '3px',
                  fontSize: '14px',
                  fontFamily: 'Barlow, sans-serif',
                  color: '#E4E7EA',
                }}
                labelStyle={{ color: '#AEB4BA' }}
                itemStyle={{ color: '#E4E7EA' }}
              />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px', color: '#AEB4BA' }} />

              {/* Stock Lines */}
              <Line yAxisId="power" type="monotone" dataKey="hpStock" name="Stock WHP" stroke={CHART.stock} strokeWidth={2} strokeDasharray="6 4" dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="tqStock" name="Stock WTQ" stroke={CHART.stock} strokeWidth={2} strokeDasharray="2 3" dot={false} />

              {/* Current Build Lines */}
              <Line yAxisId="power" type="monotone" dataKey="hpCurrent" name="Current Build WHP" stroke={CHART.current} strokeWidth={2.5} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="tqCurrent" name="Current Build WTQ" stroke={CHART.current} strokeWidth={2} strokeDasharray="4 3" dot={false} />

              {/* Target Goal Lines */}
              <Line yAxisId="power" type="monotone" dataKey="hpTarget" name="Goal Target WHP" stroke={CHART.target} strokeWidth={3} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="tqTarget" name="Goal Target WTQ" stroke={CHART.target} strokeWidth={2} strokeDasharray="4 3" dot={false} />

              {/* Boost PSI Curve */}
              <Line yAxisId="boost" type="monotone" dataKey="boostPsiTarget" name="Target Boost (PSI)" stroke={CHART.boost} strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Dyno Logs History Section */}
      <section className="panel-dark space-y-4 p-5 sm:p-6" aria-labelledby="dyno-log-title">
        <h2 id="dyno-log-title" className="h-section flex items-center gap-2">
          <Calendar className="h-4 w-4 text-dark-muted" aria-hidden="true" />
          <span>Logged Chassis Dyno Pulls</span>
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {dynoRuns.map(run => (
            <article key={run.id} className="well-dark space-y-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dark-border pb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-on-dark">{run.title}</h3>
                  {run.vehicleLabel && <p className="text-[14px] text-dark-muted">{run.vehicleLabel}</p>}
                </div>
                <span className="label-ui text-dark-muted">{run.date}</span>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="label-ui text-dark-muted">Peak WHP</dt>
                  <dd className="num mt-1 text-[18px] text-on-dark">{run.peakWhp}</dd>
                </div>
                <div>
                  <dt className="label-ui text-dark-muted">Peak WTQ</dt>
                  <dd className="num mt-1 text-[18px] text-on-dark">{run.peakWtq}</dd>
                </div>
                <div>
                  <dt className="label-ui text-dark-muted">Dyno / Fuel</dt>
                  <dd className="mt-1 text-[14px] font-semibold text-on-dark">{run.dynoType} / {run.fuelType}</dd>
                </div>
              </dl>

              {run.notes && (
                <p className="text-[15px] italic text-dark-muted">"{run.notes}"</p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Log Run Modal */}
      {showLogModal && (
        <Modal
          isOpen={showLogModal}
          onClose={closeLogModal}
          maxWidth="max-w-lg"
          header={
            <ModalBar
              title="Log Chassis Dyno Session"
              subtitle={isMember ? 'Saved to your account' : `Guest log, ${guestLeft} of ${GUEST_DAILY_LIMIT} left today`}
              onClose={closeLogModal}
            />
          }
          bodyClassName="p-5 sm:p-6"
        >
          <form onSubmit={handleAddRun} className="space-y-4">
            <div>
              <label htmlFor="dyno-title" className="field-label">Session Title</label>
              <input
                id="dyno-title"
                type="text"
                required
                maxLength={DYNO_LIMITS.title}
                value={runTitle}
                onChange={(e) => setRunTitle(e.target.value)}
                placeholder="e.g., Stage 2 MHD E30 Custom Tune Pull"
                className="field"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dyno-whp" className="field-label">Measured WHP</label>
                <input
                  id="dyno-whp"
                  type="number"
                  required
                  min={DYNO_LIMITS.power.min}
                  max={DYNO_LIMITS.power.max}
                  value={peakWhp}
                  onChange={(e) => setPeakWhp(Number(e.target.value))}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="dyno-wtq" className="field-label">Measured WTQ</label>
                <input
                  id="dyno-wtq"
                  type="number"
                  required
                  min={DYNO_LIMITS.power.min}
                  max={DYNO_LIMITS.power.max}
                  value={peakWtq}
                  onChange={(e) => setPeakWtq(Number(e.target.value))}
                  className="field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dyno-brand" className="field-label">Dyno Brand</label>
                <select
                  id="dyno-brand"
                  value={dynoType}
                  onChange={(e) => setDynoType(e.target.value as UserDynoRun['dynoType'])}
                  className="field"
                >
                  {DYNO_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dyno-fuel" className="field-label">Fuel Octane / Blend</label>
                <input
                  id="dyno-fuel"
                  type="text"
                  maxLength={DYNO_LIMITS.fuelType}
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  placeholder="93 Oct, E30, E85"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dyno-notes" className="field-label">Session Notes & Ambient Temp</label>
              <textarea
                id="dyno-notes"
                maxLength={DYNO_LIMITS.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ambient temperature, boost psi, tuner feedback..."
                className="field h-24"
              />
            </div>

            {saveError && (
              <div role="alert" className="well flex items-start gap-2 border-accent px-3 py-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
                <p className="text-[15px] text-text-2">{saveError}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button type="button" onClick={closeLogModal} className="btn btn-outline btn-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {saving ? 'Saving' : 'Save Dyno Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
