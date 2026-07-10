import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { defaultHomePath } from '@mams/types';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { AuthBrandHeader } from '../components/AuthBrandHeader';
import { PasswordInput } from '../components/ui/PasswordInput';
import { usePublicOrgBranding } from '../hooks/usePublicOrgBranding';
import { clearFirstLoginSession } from '../lib/onboarding/session';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const PASSWORD_SPECIALS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' as const;

type PasswordField = 'current' | 'new' | 'confirm';

function passwordPolicyScore(p: string): number {
  let n = 0;
  if (/[a-z]/.test(p)) n += 1;
  if (/[A-Z]/.test(p)) n += 1;
  if (/[0-9]/.test(p)) n += 1;
  if ([...p].some((c) => PASSWORD_SPECIALS.includes(c))) n += 1;
  return n;
}

function validatePasswords(
  current: string,
  next: string,
  confirm: string
): { message: string; field: PasswordField } | null {
  if (!current) return { message: 'Enter your current password', field: 'current' };
  if (!next) return { message: 'Enter a new password', field: 'new' };
  if (next.length < PASSWORD_MIN) {
    return { message: `Password must be at least ${PASSWORD_MIN} characters`, field: 'new' };
  }
  if (next.length > PASSWORD_MAX) {
    return { message: `Password must be at most ${PASSWORD_MAX} characters`, field: 'new' };
  }
  if (passwordPolicyScore(next) < 3) {
    return {
      message: `Use at least ${PASSWORD_MIN} characters and include at least 3 of: uppercase, lowercase, number, symbol.`,
      field: 'new',
    };
  }
  if (next !== confirm) return { message: 'New passwords do not match', field: 'confirm' };
  if (current === next) {
    return { message: 'New password must be different from your current password', field: 'new' };
  }
  return null;
}

function CheckIcon({ met }: { met: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {met ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="8" strokeWidth="2" />}
    </svg>
  );
}

function ChecklistItem({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${met ? 'text-green' : 'text-text-subtle'}`}>
      <CheckIcon met={met} />
      {label}
    </span>
  );
}

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errField, setErrField] = useState<PasswordField | null>(null);
  const [busy, setBusy] = useState(false);
  const user = useAuth((s) => s.user);
  const accessToken = useAuth((s) => s.accessToken);
  const refreshToken = useAuth((s) => s.refreshToken);
  const setAuth = useAuth((s) => s.setAuth);
  const clearAuth = useAuth((s) => s.clear);
  const toast = useToast((s) => s.push);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { companyName, companyLogo } = usePublicOrgBranding();

  if (!user || !accessToken || !refreshToken) {
    return null;
  }

  const lengthOk = newPassword.length >= PASSWORD_MIN && newPassword.length <= PASSWORD_MAX;
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = [...newPassword].some((c) => PASSWORD_SPECIALS.includes(c));
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validatePasswords(currentPassword, newPassword, confirmPassword);
    if (validationErr) {
      setErr(validationErr.message);
      setErrField(validationErr.field);
      return;
    }
    setBusy(true);
    setErr(null);
    setErrField(null);
    try {
      const data = await authApi.changePassword({ currentPassword, newPassword });
      setAuth({ user: data.user, accessToken, refreshToken });
      toast('Password updated. You can now use MAMS.', 'success');
      navigate(defaultHomePath(data.user.role), { replace: true });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr('Could not update password');
      }
      setErrField('current');
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      /* ignore */
    } finally {
      clearAuth();
      clearFirstLoginSession();
      qc.removeQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-shell-bg p-4">
      <div className="bg-surface rounded-2xl p-6 sm:p-10 w-full max-w-[420px] shadow-2xl border border-border">
        <AuthBrandHeader companyName={companyName} companyLogo={companyLogo} />
        <h1 className="text-2xl font-bold text-text mb-1">Set a new password</h1>
        <p className="text-text-muted text-sm mb-6">
          Hi <strong className="text-text font-semibold">{user.name}</strong>, you must change your password before using MAMS.
        </p>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="current-password" className="label !mb-2">Current password</label>
            <PasswordInput
              id="current-password"
              className={`input ${errField === 'current' ? 'border-red' : ''}`}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="new-password" className="label !mb-2">New password</label>
            <PasswordInput
              id="new-password"
              className={`input ${errField === 'new' ? 'border-red' : ''}`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className="mt-2 text-[11px] space-y-1">
              <ChecklistItem met={lengthOk} label={`${PASSWORD_MIN}–${PASSWORD_MAX} characters`} />
              <div className="text-text-subtle">Include at least 3 of:</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pl-1">
                <ChecklistItem met={hasLower} label="lowercase" />
                <ChecklistItem met={hasUpper} label="uppercase" />
                <ChecklistItem met={hasNumber} label="number" />
                <ChecklistItem met={hasSymbol} label="symbol" />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="label !mb-2">Confirm new password</label>
            <PasswordInput
              id="confirm-password"
              className={`input ${errField === 'confirm' ? 'border-red' : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && (
              <div className={`mt-2 text-[11px] inline-flex items-center gap-1 ${passwordsMatch ? 'text-green' : 'text-red'}`}>
                <CheckIcon met={passwordsMatch} />
                {passwordsMatch ? 'Passwords match' : "Passwords don't match"}
              </div>
            )}
          </div>
          {err && <div className="text-sm text-red bg-red-bg rounded-md px-3 py-2">{err}</div>}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Updating...' : 'Update password'}
          </button>
          <button type="button" onClick={() => void onSignOut()} className="w-full text-center text-xs text-text-muted hover:text-text transition-colors">
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}
