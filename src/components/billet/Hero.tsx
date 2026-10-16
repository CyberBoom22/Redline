import React from 'react';
import { Part, VehicleSelection } from '../../types';
import { BoostGauge } from './BoostGauge';
import { CarOutline } from './CarOutline';
import { Rivets } from './Rivets';

interface HeroProps {
  vehicle: VehicleSelection;
  engineName: string;
  /** Selected engine's stock boost, from the platform data. */
  boostPsi: number;
  /** Full scale of the dial. */
  boostMaxPsi: number;
  /** Parts currently checked on the build. */
  selectedParts: Part[];
  partsTotal: number;
  laborTotal: number;
  allInTotal: number;
  onPlanBuild: () => void;
  onChooseVehicle: () => void;
}

const PROCESS = [
  {
    op: 'OP 10',
    title: 'Select vehicle',
    body: 'Pick your platform, engine variant, chassis and transmission, or decode them from your VIN.',
  },
  {
    op: 'OP 20',
    title: 'Set power goal',
    body: 'Choose a target wheel horsepower. Every path is calculated from a stock vehicle.',
  },
  {
    op: 'OP 30',
    title: 'Follow the build path',
    body: 'Check off what you own, acknowledge Tier 1 warnings, then export your Build Card.',
  },
];

const money = (n: number) => `$${n.toLocaleString()}`;

/** Planner landing: hero, engraved car band, parts spec and process. */
export const Hero: React.FC<HeroProps> = ({
  vehicle,
  engineName,
  boostPsi,
  boostMaxPsi,
  selectedParts,
  partsTotal,
  laborTotal,
  allInTotal,
  onPlanBuild,
  onChooseVehicle,
}) => (
  <div className="space-y-6">
    {/* Hero */}
    <section className="grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-10">
      <div className="min-w-0 space-y-6">
        <p className="eyebrow etch">CNC-grade build planning</p>
        <h1 className="h-display etch">
          Machined to your <span className="text-accent">boost</span> target.
        </h1>
        <p className="max-w-xl text-[19px] text-text-2">
          Stage0 is the honest build planner for forced-induction BMW B58 and Infiniti VQ/VR platforms. Set a
          wheel-horsepower goal and get the calculated parts path from stock, the supporting mods it requires,
          tiered risk warnings priced as prevention versus failure, and a realistic all-in cost.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onPlanBuild} className="btn btn-primary">
            Plan your build
          </button>
          <button type="button" onClick={onChooseVehicle} className="btn btn-secondary">
            Change vehicle
          </button>
        </div>
      </div>

      <div className="plate relative mx-auto w-full max-w-md px-8 pb-8 pt-10">
        <Rivets />
        <BoostGauge value={boostPsi} max={boostMaxPsi} className="mx-auto block w-full max-w-[280px]" />
        <div className="mt-5 text-center">
          <p className="label-ui etch text-text-3">Stock boost · selected setup</p>
          <p className="etch mt-1 font-semibold text-ink">
            {vehicle.trim} · {vehicle.chassis}
          </p>
          <p className="etch text-[15px] text-text-2">{engineName}</p>
        </div>
      </div>
    </section>

    {/* Engraved car band */}
    <div className="plate relative overflow-hidden px-4 py-6 sm:px-10">
      <CarOutline className="mx-auto block h-auto w-full max-w-4xl" />
    </div>

    {/* Parts spec + process */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="panel-dark p-6 sm:p-8 lg:col-span-2" aria-labelledby="parts-spec-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dark-border pb-4">
          <h2 id="parts-spec-title" className="h-section">
            Parts spec
          </h2>
          <p className="text-[15px] text-dark-muted">
            {selectedParts.length} {selectedParts.length === 1 ? 'part' : 'parts'} checked on this build
          </p>
        </div>

        {selectedParts.length === 0 ? (
          <p className="py-6 text-dark-muted">
            No parts checked yet. Tick the parts you own or plan to buy in the build path below.
          </p>
        ) : (
          <ul className="rows-dark">
            {selectedParts.map((part) => (
              <li key={part.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <div className="font-semibold text-on-dark">{part.name}</div>
                  <div className="text-[15px] text-dark-muted">{part.brand}</div>
                </div>
                <span className={`text-[13px] ${part.isSupportingMod ? 'status-required' : 'status-recommended'}`}>
                  {part.isSupportingMod ? 'Required' : 'Recommended'}
                </span>
                <span className="num ml-auto text-right text-[15px] text-on-dark sm:ml-0 sm:w-24">{money(part.price)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-2 grid grid-cols-1 gap-4 border-t border-dark-border pt-5 sm:grid-cols-3">
          <div>
            <dt className="label-ui text-dark-muted">Parts</dt>
            <dd className="num mt-1 text-[26px] leading-tight text-on-dark">{money(partsTotal)}</dd>
          </div>
          <div>
            <dt className="label-ui text-dark-muted">Est. labor</dt>
            <dd className="num mt-1 text-[26px] leading-tight text-on-dark">{money(laborTotal)}</dd>
          </div>
          <div>
            <dt className="label-ui text-dark-muted">Realistic all-in</dt>
            <dd className="num mt-1 text-[26px] leading-tight text-on-dark">{money(allInTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="plate relative px-6 py-9 sm:px-8" aria-labelledby="process-title">
        <Rivets />
        <h2 id="process-title" className="h-section etch text-ink">
          Process
        </h2>
        <ol className="mt-5 space-y-5">
          {PROCESS.map((step) => (
            <li key={step.op}>
              <div className="op-label etch">{step.op}</div>
              <div className="mt-1 font-bold text-ink">{step.title}</div>
              <p className="text-[16px] text-text-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  </div>
);
