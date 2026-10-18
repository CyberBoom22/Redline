import React, { useEffect, useState } from 'react';
import { Link, useHref, useSearchParams } from 'react-router-dom';
import { VehicleSelection, UserFlowDoor, UserIntent } from './types';
import { PLATFORMS, DEFAULT_VEHICLE } from './data/platforms';
import { getPartsForEngine } from './data/parts';
import { getWarningsForBuild } from './data/warnings';
import { decodeBuild, encodeBuild, stripBuildParams } from './lib/buildShare';

// Components
import { Header } from './components/Header';
import { PlatformSelectorModal } from './components/PlatformSelectorModal';
import { InstrumentCluster } from './components/BuildPlanner/InstrumentCluster';
import { DoorSelection } from './components/BuildPlanner/DoorSelection';
import { PowerGoalPicker } from './components/BuildPlanner/PowerGoalPicker';
import { BuildPath } from './components/BuildPlanner/BuildPath';
import { CompareSlider } from './components/BuildPlanner/CompareSlider';
import { WarningsPanel } from './components/BuildPlanner/WarningsPanel';
import { BuildSummaryModal } from './components/BuildSummaryModal';
import { Hero } from './components/billet/Hero';
import { Logo } from './components/billet/Logo';
import { AccountModal, AccountMode } from './account/AccountModal';

// Tabs
import { PartsMarketplace } from './components/Marketplace/PartsMarketplace';
import { DynoTracker } from './components/DynoTracker/DynoTracker';
import { SoundHub } from './components/SoundHub/SoundHub';
import { PartsCare } from './components/PartsCare/PartsCare';
import { TunersList } from './components/Tuners/TunersList';

export default function App() {
  // A Build Card share link restores the exact build it was made from. It is
  // read once on load; decodeBuild validates everything in it.
  const [searchParams, setSearchParams] = useSearchParams();
  const [sharedBuild] = useState(() => decodeBuild(searchParams));

  const [vehicle, setVehicle] = useState<VehicleSelection>(sharedBuild?.vehicle ?? DEFAULT_VEHICLE);
  const [doorMode, setDoorMode] = useState<UserFlowDoor>('goal_first');
  const [intent, setIntent] = useState<UserIntent>('power');
  const [goalWhp, setGoalWhp] = useState<number>(sharedBuild?.goalWhp ?? 500);

  // Default pre-checked inventory (e.g., stage 1 tune + dropin filter)
  const [ownedPartIds, setOwnedPartIds] = useState<string[]>(
    sharedBuild?.ownedPartIds ?? ['b58_bootmod3', 'b58_oem_filter_dropin']
  );

  const [acknowledgedWarningIds, setAcknowledgedWarningIds] = useState<string[]>(
    sharedBuild?.acknowledgedWarningIds ?? []
  );

  // Once restored, drop the parameters so the address bar does not keep
  // describing a build the visitor goes on to change.
  useEffect(() => {
    if (sharedBuild) setSearchParams(stripBuildParams(searchParams), { replace: true });
    // Runs once, on the load that carried the link.
  }, []);
  const [activeTab, setActiveTab] = useState<'planner' | 'marketplace' | 'dyno' | 'sound' | 'care' | 'tuners'>('planner');

  // Modals
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);
  // Someone opening a shared build lands on its Build Card.
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(sharedBuild !== null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [account, setAccount] = useState<{ open: boolean; mode: AccountMode; reason?: string }>({
    open: false,
    mode: 'register'
  });
  const openAccount = (mode: AccountMode, reason?: string) => setAccount({ open: true, mode, reason });

  // Engine Specs lookup
  const currentPlatform = PLATFORMS.find(p => p.id === vehicle.platformId) || PLATFORMS[0];
  const currentEngine = currentPlatform.engines.find(e => e.id === vehicle.engineId) || currentPlatform.engines[0];
  const stockWhp = currentEngine.stockWhp;
  const stockWtq = currentEngine.stockWtq;

  // Full scale of the hero boost dial; matches the dyno chart's boost axis.
  const BOOST_GAUGE_MAX_PSI = 30;

  // Parts for current engine
  const engineParts = getPartsForEngine(vehicle.engineId);

  // Calculate stats
  const selectedOwnedParts = engineParts.filter(p => ownedPartIds.includes(p.id));
  const totalWhpGains = selectedOwnedParts.reduce((sum, p) => sum + p.whpGain, 0);
  const projectedWhp = stockWhp + totalWhpGains;

  const partsTotal = selectedOwnedParts.reduce((sum, p) => sum + p.price, 0);
  const supportingTotal = selectedOwnedParts.filter(p => p.isSupportingMod).reduce((sum, p) => sum + p.price, 0);
  const laborTotal = selectedOwnedParts.reduce((sum, p) => sum + p.estLaborCost, 0);
  // Same figure the instrument cluster labels "Realistic All-In".
  const allInTotal = partsTotal + supportingTotal + laborTotal;

  const gapWhp = Math.max(0, goalWhp - projectedWhp);

  // Triggered warnings at highest power level between projected & target goal
  const warnings = getWarningsForBuild(vehicle.engineId, Math.max(projectedWhp, goalWhp));
  const unacknowledgedGatedWarnings = warnings.filter(w => w.tier === 1 && !acknowledgedWarningIds.includes(w.id));

  // Toggle part inventory state
  const handleTogglePartOwned = (partId: string) => {
    if (ownedPartIds.includes(partId)) {
      setOwnedPartIds(ownedPartIds.filter(id => id !== partId));
    } else {
      setOwnedPartIds([...ownedPartIds, partId]);
    }
  };

  // Toggle warning acknowledgment
  const handleAcknowledgeWarning = (warningId: string) => {
    if (acknowledgedWarningIds.includes(warningId)) {
      setAcknowledgedWarningIds(acknowledgedWarningIds.filter(id => id !== warningId));
    } else {
      setAcknowledgedWarningIds([...acknowledgedWarningIds, warningId]);
    }
  };

  // Link to this exact build, in whichever router mode is active.
  const shareHref = useHref({
    pathname: '/',
    search: `?${encodeBuild({ vehicle, goalWhp, ownedPartIds, acknowledgedWarningIds })}`,
  });
  const shareUrl = new URL(shareHref, window.location.href).toString();

  const handleSelectVehicle = (newVehicle: VehicleSelection) => {
    setVehicle(newVehicle);
    const newPlatform = PLATFORMS.find(p => p.id === newVehicle.platformId)!;
    const newEngine = newPlatform.engines.find(e => e.id === newVehicle.engineId)!;
    setGoalWhp(newEngine.stockWhp + 110);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header Bar */}
      <Header
        vehicle={vehicle}
        onOpenVehicleModal={() => setIsVehicleModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
        onOpenAccount={openAccount}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Main View Router */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            <Hero
              vehicle={vehicle}
              engineName={currentEngine.name}
              boostPsi={currentEngine.stockBoostPsi}
              boostMaxPsi={BOOST_GAUGE_MAX_PSI}
              selectedParts={selectedOwnedParts}
              partsTotal={partsTotal}
              laborTotal={laborTotal}
              allInTotal={allInTotal}
              onPlanBuild={() =>
                document.getElementById('planner-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              onChooseVehicle={() => setIsVehicleModalOpen(true)}
            />

            {/* Instrument Cluster Top Cockpit HUD */}
            <div id="planner-workspace" className="scroll-mt-6 md:scroll-mt-40" />
            <InstrumentCluster
              stockWhp={stockWhp}
              projectedWhp={projectedWhp}
              goalWhp={goalWhp}
              partsTotal={partsTotal}
              supportingTotal={supportingTotal}
              laborTotal={laborTotal}
              gapWhp={gapWhp}
              unacknowledgedGatedWarningsCount={unacknowledgedGatedWarnings.length}
              onOpenCompareSlider={() => setIsCompareModalOpen(true)}
              showCompareModal={isCompareModalOpen}
            />

            {/* Core User Flow Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column: Controls & Goal Selection */}
              <div className="min-w-0 space-y-6">
                <DoorSelection
                  doorMode={doorMode}
                  onSelectDoor={setDoorMode}
                />

                <PowerGoalPicker
                  stockWhp={stockWhp}
                  goalWhp={goalWhp}
                  onGoalWhpChange={setGoalWhp}
                  intent={intent}
                  onIntentChange={setIntent}
                />

                {/* Tiered Risk Warnings Panel */}
                <WarningsPanel
                  warnings={warnings}
                  acknowledgedIds={acknowledgedWarningIds}
                  onAcknowledgeWarning={handleAcknowledgeWarning}
                />
              </div>

              {/* Right Column (2 cols wide): The Standard Calculated Path */}
              <div className="min-w-0 lg:col-span-2">
                <BuildPath
                  parts={engineParts}
                  ownedPartIds={ownedPartIds}
                  onTogglePartOwned={handleTogglePartOwned}
                  warnings={warnings}
                  onAcknowledgeWarning={handleAcknowledgeWarning}
                  acknowledgedWarningIds={acknowledgedWarningIds}
                  goalWhp={goalWhp}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Parts Catalog Marketplace */}
        {activeTab === 'marketplace' && (
          <PartsMarketplace
            engineId={vehicle.engineId}
            ownedPartIds={ownedPartIds}
            onTogglePartOwned={handleTogglePartOwned}
          />
        )}

        {/* Tab 3: Interactive Dyno Visualizer */}
        {activeTab === 'dyno' && (
          <DynoTracker
            vehicle={vehicle}
            stockWhp={stockWhp}
            stockWtq={stockWtq}
            projectedWhp={projectedWhp}
            goalWhp={goalWhp}
            onRequestAccount={openAccount}
          />
        )}

        {/* Tab 4: Sound & Exhaust Branch */}
        {activeTab === 'sound' && (
          <SoundHub engineId={vehicle.engineId} />
        )}

        {/* Tab 5: Parts Care Ownership Layer */}
        {activeTab === 'care' && (
          <PartsCare
            engineId={vehicle.engineId}
            ownedPartIds={ownedPartIds}
          />
        )}

        {/* Tab 6: Vetted Tuner Network */}
        {activeTab === 'tuners' && (
          <TunersList platformId={vehicle.platformId} />
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-ink text-on-dark">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">
          <Logo />
          <p className="max-w-3xl text-[16px] text-on-dark">
            <strong className="font-bold">The disclaimer:</strong> All build paths are calculated from a stock vehicle. Checking off mods you already have only marks your place on that path — it doesn't change the path, recalculate for your specific car, or account for its condition, history, or mileage. You'll still see every step and every precaution, whether you've done it or not. This is reference information, not advice for your individual vehicle.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-dark-border pt-4">
            <p className="label-ui text-dark-muted">
              STAGE0 v0.2 · BMW B58 &amp; Infiniti VQ/VR Pilot Edition · Confidential Reference Information
            </p>
            {/* Operator entry point. Deliberately plain: hiding the URL is not a
                control, and pretending otherwise invites treating it as one. The
                gate is Row Level Security, which returns nothing to anyone who is
                not the administrator, whether or not they find this link. */}
            <Link
              to="/admin/login"
              className="inline-flex min-h-[44px] items-center text-[14px] font-semibold uppercase tracking-[1.5px] text-dark-muted hover:text-on-dark"
            >
              Operator sign in
            </Link>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PlatformSelectorModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        vehicle={vehicle}
        onSelectVehicle={handleSelectVehicle}
      />

      <BuildSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        vehicle={vehicle}
        goalWhp={goalWhp}
        projectedWhp={projectedWhp}
        parts={engineParts}
        ownedPartIds={ownedPartIds}
        warnings={warnings}
        acknowledgedWarningIds={acknowledgedWarningIds}
        stockWhp={stockWhp}
        shareUrl={shareUrl}
        onTogglePartOwned={handleTogglePartOwned}
        onGoalWhpChange={setGoalWhp}
        onAcknowledgeWarning={handleAcknowledgeWarning}
      />

      <AccountModal
        isOpen={account.open}
        onClose={() => setAccount((prev) => ({ ...prev, open: false }))}
        initialMode={account.mode}
        reason={account.reason}
      />

      <CompareSlider
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        engineId={vehicle.engineId}
        stockWhp={stockWhp}
      />
    </div>
  );
}
