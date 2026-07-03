import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { AuthBrandHeader } from '../components/AuthBrandHeader';
import { usePublicOrgBranding } from '../hooks/usePublicOrgBranding';

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const PASSWORD_SPECIALS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' as const;

function passwordPolicyScore(p: string): number {
  let n = 0;
  if (/[a-z]/.test(p)) n += 1;
  if (/[A-Z]/.test(p)) n += 1;
  if (/[0-9]/.test(p)) n += 1;
  if ([...p].some((c) => PASSWORD_SPECIALS.includes(c))) n += 1;
  return n;
}

function validatePasswords(current: string, next: string, confirm: string): string | null {
  if (!current) return 'Enter your current password';
  if (!next) return 'Enter a new password';
  if (next.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (next.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`;
  if (passwordPolicyScore(next) < 3) {
    return `Use at least ${PASSWORD_MIN} characters and include at least 3 of: uppercase, lowercase, number, symbol.`;
  }
  if (next !== confirm) return 'New passwords do not match';
  if (current === next) return 'New password must be different from your current password';
  return null;
}

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const user = useAuth((s) => s.user);
  const accessToken = useAuth((s) => s.accessToken);
  const refreshToken = useAuth((s) => s.refreshToken);
  const setAuth = useAuth((s) => s.setAuth);
  const toast = useToast((s) => s.push);
  const navigate = useNavigate();
  const { companyName, companyLogo } = usePublicOrgBranding();

  if (!user || !accessToken || !refreshToken) {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validatePasswords(currentPassword, newPassword, confirmPassword);
    if (validationErr) {
      setErr(validationErr);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const data = await authApi.changePassword({ currentPassword, newPassword });
      setAuth({ user: data.user, accessToken, refreshToken });
      toast('Password updated. You can now use MAMS.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr('Could not update password');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-shell-bg p-4">
      <div className="bg-surface rounded-2xl p-6 sm:p-10 w-full max-w-[420px] shadow-2xl border border-border">
        <AuthBrandHeader companyName={companyName} companyLogo={companyLogo} />
        <h1 className="text-2xl font-bold text-text mb-1">Set a new password</h1>
        <p className="text-text-muted text-sm mb-6">
          Hi {user.name}, you must change your password before using MAMS.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <p className="text-[11px] text-text-subtle">
            {PASSWORD_MIN}–{PASSWORD_MAX} characters; include at least 3 of: uppercase, lowercase, number, symbol.
          </p>
          {err && <div className="text-sm text-red bg-red-bg rounded-md px-3 py-2">{err}</div>}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
