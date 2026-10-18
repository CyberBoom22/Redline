import React from 'react';
import { VehicleSelection } from '../types';
import { Search, FileText, UserRound } from 'lucide-react';
import { Logo } from './billet/Logo';
import { useMember } from '../account/MemberProvider';
import type { AccountMode } from '../account/AccountModal';

/** Log in, or the signed-in member's email with a sign-out button. Hidden when accounts are unavailable. */
const AccountControl: React.FC<{ onOpenAccount: (mode: AccountMode) => void; className?: string }> = ({
  onOpenAccount,
  className = ''
}) => {
  const member = useMember();
  if (!member.available || member.loading) return null;
  if (member.session) {
    return (
      <div className={`items-center gap-2 ${className}`}>
        <span className="hidden max-w-[14rem] truncate text-[14px] text-dark-muted 2xl:inline" title={member.session.user.email}>
          {member.session.user.email}
        </span>
        <button type="button" onClick={() => void member.signOut()} className="btn btn-ghost-dark btn-sm shrink-0">
          Sign out
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => onOpenAccount('login')} className={`btn btn-ghost-dark btn-sm shrink-0 ${className}`}>
      <UserRound className="h-4 w-4" aria-hidden="true" />
      <span>Log in</span>
    </button>
  );
};

type Tab = 'planner' | 'marketplace' | 'dyno' | 'sound' | 'care' | 'tuners';

interface HeaderProps {
  vehicle: VehicleSelection;
  onOpenVehicleModal: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenSummaryModal: () => void;
  onOpenAccount: (mode: AccountMode) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'planner', label: 'Build Planner' },
  { id: 'marketplace', label: 'Parts Catalog' },
  { id: 'dyno', label: 'Dyno Visualizer' },
  { id: 'sound', label: 'Sound & Exhaust' },
  { id: 'care', label: 'Parts Care' },
  { id: 'tuners', label: 'Vetted Tuners' },
];

export const Header: React.FC<HeaderProps> = ({
  vehicle,
  onOpenVehicleModal,
  activeTab,
  setActiveTab,
  onOpenSummaryModal,
  onOpenAccount
}) => {
  return (
    <header className="z-40 bg-ink md:sticky md:top-0 text-on-dark shadow-[0_6px_16px_-10px_rgba(0,0,0,0.6)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex flex-col gap-3 border-b border-dark-border py-3 md:flex-row md:items-center md:justify-between md:gap-6">
          {/* Logo & Tagline */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <Logo />
              <span className="label-ui text-dark-muted">v0.2</span>
              <p className="hidden text-[15px] text-dark-muted lg:block">
                The honest build planner for forced-induction platforms
              </p>
            </div>
            {/* Phones: account control shares the logo row. */}
            <AccountControl onOpenAccount={onOpenAccount} className="flex md:hidden" />
          </div>

          {/* Vehicle Selector & Build Card */}
          <div className="flex w-full items-center gap-2 md:w-auto">
            <AccountControl onOpenAccount={onOpenAccount} className="hidden md:flex" />
            <button
              onClick={onOpenVehicleModal}
              id="vehicle-selector-btn"
              aria-label={`Change vehicle (current: ${vehicle.trim}, ${vehicle.chassis}, ${vehicle.transmission})`}
              className="btn btn-ghost-dark btn-sm min-w-0 flex-1 justify-between gap-3 normal-case tracking-normal md:flex-none"
            >
              <span className="flex min-w-0 items-center gap-3 text-left">
                <span className="label-ui shrink-0 text-accent-bright">
                  {vehicle.platformId === 'b58' ? 'B58' : 'VQ'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold uppercase tracking-[1px] text-dark-muted">
                    {vehicle.chassis} · {vehicle.transmission}
                  </span>
                  <span className="block truncate text-[15px] font-bold text-on-dark">{vehicle.trim}</span>
                </span>
              </span>
              <Search className="h-4 w-4 shrink-0 text-dark-muted" aria-hidden="true" />
            </button>

            {/* Quick Export Summary Button */}
            <button
              onClick={onOpenSummaryModal}
              id="open-summary-btn"
              className="btn btn-primary btn-sm shrink-0 whitespace-nowrap"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>Build Card</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Sections" className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <ul className="flex items-stretch gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    id={`tab-${tab.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-[48px] items-center whitespace-nowrap border-b-2 px-3 text-[14px] font-semibold uppercase tracking-[1.5px] transition-colors sm:px-4 ${
                      isActive
                        ? 'border-accent text-on-dark'
                        : 'border-transparent text-dark-muted hover:border-anodize-bright hover:text-on-dark'
                    }`}
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};
