import React from 'react';

/** Centred panel shared by the sign-in and registration screens. */
export const AdminShell: React.FC<{
  title: string;
  configError?: string | null;
  children: React.ReactNode;
}> = ({ title, configError, children }) => (
  <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center px-4 py-12 selection:bg-red-600 selection:text-white">
    <div className="w-full max-w-sm space-y-4">
      <h1 className="sr-only">{title}</h1>
      {configError ? (
        <div className="bg-slate-900 border border-red-800/70 rounded-2xl p-6 space-y-2">
          <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-red-400">
            Configuration required
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{configError}</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">{children}</div>
      )}
    </div>
  </div>
);
