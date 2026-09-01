import React, { useState } from 'react';
import { EngineId, VehicleSelection, UserDynoRun, DynoDataPoint } from '../../types';
import { generateDynoCurveData } from '../../data/platforms';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Activity, Plus, Gauge, Calendar, Flame, Sliders, FileText, Check } from 'lucide-react';

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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold font-mono text-white uppercase tracking-wider">
              Interactive Dyno Graph Visualizer & Log
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time overlay comparison of stock horsepower/torque curves against projected build target and logged real-world dyno runs.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          id="log-dyno-run-btn"
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/30 flex items-center gap-2 transition-all border border-red-500/40 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Log Real Dyno Run</span>
        </button>
      </div>

      {/* Main Chart Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <span className="font-bold text-red-400">GRAPH OVERLAY:</span>
            <span>{vehicle.trim} ({vehicle.chassis})</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" />
              <span className="text-slate-400">Stock ({stockWhp} WHP)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              <span className="text-slate-300">Current Build ({projectedWhp} WHP)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-slate-100 font-bold">Goal Target ({goalWhp} WHP)</span>
            </div>
          </div>
        </div>

        {/* Recharts Line Chart */}
        <div className="h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dynoCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="rpm" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="power" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 'dataMax + 60']} />
              <YAxis yAxisId="boost" orientation="right" stroke="#38bdf8" tick={{ fill: '#38bdf8', fontSize: 11 }} domain={[0, 30]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {/* Stock Lines */}
              <Line yAxisId="power" type="monotone" dataKey="hpStock" name="Stock WHP" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="tqStock" name="Stock WTQ" stroke="#475569" strokeWidth={2} strokeDasharray="3 3" dot={false} />

              {/* Current Build Lines */}
              <Line yAxisId="power" type="monotone" dataKey="hpCurrent" name="Current Build WHP" stroke="#10b981" strokeWidth={3} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="tqCurrent" name="Current Build WTQ" stroke="#34d399" strokeWidth={2} strokeDasharray="2 2" dot={false} />

              {/* Target Goal Lines */}
              <Line yAxisId="power" type="monotone" dataKey="hpTarget" name="Goal Target WHP" stroke="#ef4444" strokeWidth={3} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="tqTarget" name="Goal Target WTQ" stroke="#f87171" strokeWidth={2} strokeDasharray="2 2" dot={false} />

              {/* Boost PSI Curve */}
              <Line yAxisId="boost" type="monotone" dataKey="boostPsiTarget" name="Target Boost (PSI)" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dyno Logs History Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-500" />
          <span>Logged Chassis Dyno Pulls</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dynoRuns.map(run => (
            <div key={run.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-100">{run.title}</span>
                <span className="text-[10px] text-slate-500">{run.date}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-slate-900 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Peak WHP</span>
                  <span className="text-red-400 font-bold text-sm">{run.peakWhp}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Peak WTQ</span>
                  <span className="text-slate-200 font-bold text-sm">{run.peakWtq}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Dyno / Fuel</span>
                  <span className="text-amber-400 font-bold text-[11px]">{run.dynoType} / {run.fuelType}</span>
                </div>
              </div>

              {run.notes && (
                <p className="text-[11px] text-slate-400 font-sans italic pt-1">
                  "{run.notes}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Log Run Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-100">
            <h3 className="font-mono font-bold text-base uppercase text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              <span>Log Chassis Dyno Session</span>
            </h3>

            <form onSubmit={handleAddRun} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={runTitle}
                  onChange={(e) => setRunTitle(e.target.value)}
                  placeholder="e.g., Stage 2 MHD E30 Custom Tune Pull"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Measured WHP</label>
                  <input
                    type="number"
                    value={peakWhp}
                    onChange={(e) => setPeakWhp(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Measured WTQ</label>
                  <input
                    type="number"
                    value={peakWtq}
                    onChange={(e) => setPeakWtq(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dyno Brand</label>
                  <select
                    value={dynoType}
                    onChange={(e) => setDynoType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Dynojet">Dynojet</option>
                    <option value="Mustang Dyno">Mustang Dyno</option>
                    <option value="Mainline">Mainline</option>
                    <option value="Virtual Dyno">Virtual Dyno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Fuel Octane / Blend</label>
                  <input
                    type="text"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    placeholder="93 Oct, E30, E85"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Session Notes & Ambient Temp</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ambient temperature, boost psi, tuner feedback..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Save Dyno Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
