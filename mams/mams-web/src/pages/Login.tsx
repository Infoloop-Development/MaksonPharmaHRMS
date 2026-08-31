import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { setFirstLoginSession } from '../lib/onboarding/session';
import { useAuth } from '../store/auth';
import { defaultHomePath } from '@mams/types';
import { resetSessionStart } from '../lib/bugReport';
import { AuthBrandHeader } from '../components/AuthBrandHeader';
import { PasswordInput } from '../components/ui/PasswordInput';
import { usePublicOrgBranding } from '../hooks/usePublicOrgBranding';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { companyName, companyLogo } = usePublicOrgBranding();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const data = await authApi.login({ email, password });
      qc.removeQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      setAuth(data);
      resetSessionStart();
      if (data.isFirstLogin) {
        setFirstLoginSession();
      }
      if (data.user.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      navigate(defaultHomePath(data.user.role));
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-shell-bg p-4">
      <div className="bg-surface rounded-2xl p-6 sm:p-12 w-full max-w-[420px] shadow-2xl border border-border">
        <AuthBrandHeader companyName={companyName} companyLogo={companyLogo} />
        <h1 className="text-2xl font-bold text-text mb-1">Attendance Management</h1>
        <p className="text-text-muted text-sm mb-7">Login to continue</p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label !mb-2">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label !mb-2">Password</label>
            <PasswordInput
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {err && <div className="text-sm text-red bg-red-bg rounded-md px-3 py-2">{err}</div>}

          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6 text-[11px] text-text-muted">
          Powered by{' '}
          <a href="https://www.infoloop.co" className="text-link font-semibold no-underline hover:underline" target="_blank" rel="noreferrer">
            Infoloop Technologies
          </a>
        </div>
      </div>
    </div>
  );
}
