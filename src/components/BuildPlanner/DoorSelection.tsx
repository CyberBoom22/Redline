import React from 'react';
import { UserFlowDoor } from '../../types';
import { Target, CheckSquare } from 'lucide-react';

interface DoorSelectionProps {
  doorMode: UserFlowDoor;
  onSelectDoor: (door: UserFlowDoor) => void;
}

const DOORS: {
  id: UserFlowDoor;
  domId: string;
  title: string;
  body: string;
  Icon: typeof Target;
}[] = [
  {
    id: 'goal_first',
    domId: 'door-goal-first',
    title: 'Goal-First ("Plan me to WHP")',
    body: 'Select your targeted horsepower goal. Stage0 maps out the exact parts, required supporting mods, and risk warnings to get there.',
    Icon: Target,
  },
  {
    id: 'inventory_first',
    domId: 'door-inventory-first',
    title: 'Inventory-First ("Here\'s what I have")',
    body: 'Check off your existing modifications. Stage0 pre-checks your inventory on the fixed path and exposes missing critical gaps.',
    Icon: CheckSquare,
  },
];

export const DoorSelection: React.FC<DoorSelectionProps> = ({ doorMode, onSelectDoor }) => {
  return (
    <section className="plate space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="label-ui etch text-text-3">Build Planning Flow ("Two Doors, One Output")</h2>
        <p className="text-[15px] text-text-2">Both doors feed the exact same calculated path from stock.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {DOORS.map(({ id, domId, title, body, Icon }) => {
          const isActive = doorMode === id;
          return (
            <button
              key={id}
              onClick={() => onSelectDoor(id)}
              id={domId}
              aria-pressed={isActive}
              className="toggle items-start p-4 text-left"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? 'text-accent-bright' : 'text-text-3'}`} aria-hidden="true" />
              <span>
                <span className="flex flex-wrap items-center gap-2 font-bold">
                  <span>{title}</span>
                  {isActive && <span className="chip chip-accent">Active</span>}
                </span>
                <span className={`mt-1 block text-[15px] font-normal leading-snug ${isActive ? 'text-dark-muted' : 'text-text-2'}`}>
                  {body}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
