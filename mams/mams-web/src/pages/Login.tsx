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
import { usePublicOrgBranding } from '../hooks/usePublicOrgBranding';

export function Login() {
  const [email, setEmail] = useState('org.admin@makson-group.com');
  const [password, setPassword] = useState('makson2026');
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
      navigate(data.user.mustChangePassword ? '/change-password' : defaultHomePath(data.user.role));
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
        <p className="text-text-muted text-sm mb-7">Sign in to continue</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr.admin@makson-group.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
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

        <div className="mt-6 p-3 bg-surface2 rounded-md text-[11px] text-text-muted leading-relaxed">
          <strong className="text-text">Demo credentials</strong> (password{' '}
          <code className="auth-inline-code">makson2026</code>):
          <br />
          <code className="auth-inline-code">org.admin@makson-group.com</code>: Admin Console
          <br />
          <code className="auth-inline-code">it.admin@makson-group.com</code>: IT Admin (Admin Console + Recycle bin)
          <br />
          <code className="auth-inline-code">hr.admin@makson-group.com</code>: HR (real / 12-hour view)
          <br />
          <code className="auth-inline-code">hr.compliance@makson-group.com</code>: Compliance (8-hour view)
          <br />
          <span className="text-text-muted">
            First time or login fails? From the <code className="auth-inline-code">mams</code> folder run:{' '}
            <code className="auth-inline-code">npm run seed:users</code>
          </span>
        </div>

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
