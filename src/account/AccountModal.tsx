import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ModalBar } from '../components/billet/ModalBar';
import { supabase } from '../lib/supabase';

export type AccountMode = 'register' | 'login';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AccountMode;
  /** Why the modal opened, shown above the form. */
  reason?: string;
}

export const MIN_MEMBER_PASSWORD = 8;

/**
 * Register / log in for members. Email confirmation is expected to be on in
 * Supabase, so a sign-up returns no session and asks the person to confirm
 * first. Error messages are generic on purpose: "already registered" or "no
 * such user" would tell anyone which addresses have accounts.
 */
export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, initialMode = 'register', reason }) => {
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setError(null);
    setNotice(null);
    setPassword('');
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const switchMode = (next: AccountMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        if (password.length < MIN_MEMBER_PASSWORD) {
          setError(`Choose a password of at least ${MIN_MEMBER_PASSWORD} characters.`);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) {
          setError('Could not create the account. Check the email and password and try again.');
          return;
        }
        if (data.session) {
          onClose();
          return;
        }
        setNotice(`Check ${email.trim()} for a confirmation link, then come back and log in.`);
        setPassword('');
        setMode('login');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) {
          setError('Sign in failed. Check the email and password. If you just registered, confirm your email first.');
          return;
        }
        onClose();
      }
    } catch {
      setError('Something went wrong reaching the account service. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      header={
        <ModalBar
          title={mode === 'register' ? 'Create a free account' : 'Log in'}
          subtitle="Unlimited dyno logs, saved to your account"
          onClose={onClose}
        />
      }
      bodyClassName="p-5 sm:p-6"
    >
      <div className="space-y-5">
        {reason && <p className="well px-3 py-2.5 text-[15px] text-text-2">{reason}</p>}

        <div role="group" aria-label="Account" className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={mode === 'register'} onClick={() => switchMode('register')} className="toggle justify-center">
            Register
          </button>
          <button type="button" aria-pressed={mode === 'login'} onClick={() => switchMode('login')} className="toggle justify-center">
            Log in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member-email" className="field-label">Email</label>
            <input
              id="member-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="member-password" className="field-label">Password</label>
            <input
              id="member-password"
              type="password"
              required
              minLength={mode === 'register' ? MIN_MEMBER_PASSWORD : undefined}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === 'register' ? 'member-password-hint' : undefined}
              className="field"
            />
            {mode === 'register' && (
              <span id="member-password-hint" className="mt-1 block text-[14px] text-text-2">
                At least {MIN_MEMBER_PASSWORD} characters.
              </span>
            )}
          </div>

          {error && (
            <div role="alert" className="well flex items-start gap-2 border-accent px-3 py-2.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
              <p className="text-[15px] text-text-2">{error}</p>
            </div>
          )}
          {notice && (
            <p role="status" className="well px-3 py-2.5 text-[15px] text-text-2">{notice}</p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary btn-sm w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mode === 'register' ? (busy ? 'Creating account' : 'Create account') : busy ? 'Logging in' : 'Log in'}
          </button>
        </form>
      </div>
    </Modal>
  );
};
