import React, { useState } from 'react';
import { EngineId, VehicleSelection, UserDynoRun, DynoDataPoint } from '../../types';
import { generateDynoCurveData } from '../../data/platforms';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Plus, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalBar } from '../billet/ModalBar';
import { PageHeader } from '../billet/PageHeader';

// Chart ink on the dark panel. The brand palette is deliberately achromatic
// plus red, so every series also carries its own dash pattern and the legend
// names it — identity never rests on colour alone. All marks clear 3:1
// against the ink face.
const CHART = {
  stock: '#8E9399',
  current: '#E4E7EA',
  target: '#F2545B',
  boost: '#C9CDD1',
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
}

export const DynoTracker: React.FC<DynoTrackerProps> = ({
  vehicle,
  stockWhp,
  stockWtq,
  projectedWhp,
  goalWhp
}) => {
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

  // User logged dyno runs
  const [dynoRuns, setDynoRuns] = useState<UserDynoRun[]>([
    {
      id: 'run_1',
      date: '2026-05-12',
      title: 'Baseline Dynojet Run (Stock Tune & Filter)',
      dynoType: 'Dynojet',
      peakWhp: stockWhp + 10,
      peakWtq: stockWtq + 8,
      maxBoostPsi: 11.8,
      fuelType: '93 Octane',
      ambientTempF: 72,
      notes: 'Clean baseline pull on 4th gear. Smooth power delivery.',
      dataPoints: dynoCurveData
    }
  ]);

  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [runTitle, setRunTitle] = useState<string>('');
  const [peakWhp, setPeakWhp] = useState<number>(projectedWhp);
  const [peakWtq, setPeakWtq] = useState<number>(estimatedCurrentWtq);
  const [dynoType, setDynoType] = useState<UserDynoRun['dynoType']>('Dynojet');
  const [fuelType, setFuelType] = useState<string>('93 Octane');
  const [boostPsi, setBoostPsi] = useState<number>(18);
  const [notes, setNotes] = useState<string>('');

  const handleAddRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runTitle) return;

    const newRun: UserDynoRun = {
      id: `run_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      title: runTitle,
      dynoType,
      peakWhp,
      peakWtq,
      maxBoostPsi: boostPsi,
      fuelType,
      ambientTempF: 75,
      notes,
      dataPoints: generateDynoCurveData(stockWhp, stockWtq, peakWhp, peakWtq)
    };

    setDynoRuns([newRun, ...dynoRuns]);
    setShowLogModal(false);
    setRunTitle('');
    setNotes('');
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
            onClick={() => setShowLogModal(true)}
            id="log-dyno-run-btn"
            className="btn btn-primary w-full whitespace-nowrap md:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Log Real Dyno Run</span>
          </button>
        }
      />

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
              <YAxis yAxisId="boost" orientation="right" stroke={CHART.axis} tick={{ fill: CHART.tick, fontSize: 12 }} domain={[0, 30]} />
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
                <h3 className="font-bold text-on-dark">{run.title}</h3>
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
          onClose={() => setShowLogModal(false)}
          maxWidth="max-w-lg"
          header={<ModalBar title="Log Chassis Dyno Session" onClose={() => setShowLogModal(false)} />}
          bodyClassName="p-5 sm:p-6"
        >
          <form onSubmit={handleAddRun} className="space-y-4">
            <div>
              <label htmlFor="dyno-title" className="field-label">Session Title</label>
              <input
                id="dyno-title"
                type="text"
                required
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
                  onChange={(e) => setDynoType(e.target.value as any)}
                  className="field"
                >
                  <option value="Dynojet">Dynojet</option>
                  <option value="Mustang Dyno">Mustang Dyno</option>
                  <option value="Mainline">Mainline</option>
                  <option value="Virtual Dyno">Virtual Dyno</option>
                </select>
              </div>
              <div>
                <label htmlFor="dyno-fuel" className="field-label">Fuel Octane / Blend</label>
                <input
                  id="dyno-fuel"
                  type="text"
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ambient temperature, boost psi, tuner feedback..."
                className="field h-24"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowLogModal(false)} className="btn btn-outline btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Save Dyno Log
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
