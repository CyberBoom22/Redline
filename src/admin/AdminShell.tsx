import React from 'react';
import { Rivets } from '../components/billet/Rivets';

/** Centred panel shared by the sign-in and registration screens. */
export const AdminShell: React.FC<{
  title: string;
  configError?: string | null;
  children: React.ReactNode;
}> = ({ title, configError, children }) => (
  <div className="flex min-h-screen items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm space-y-4">
      <h1 className="sr-only">{title}</h1>
      {configError ? (
        <div className="plate space-y-2 border border-accent p-6">
          <h2 className="h-section etch text-accent-deep">Configuration required</h2>
          <p className="text-[16px] text-text-2">{configError}</p>
        </div>
      ) : (
        <div className="plate relative px-6 py-9 sm:px-8">
          <Rivets />
          {children}
        </div>
      )}
    </div>
  </div>
);
