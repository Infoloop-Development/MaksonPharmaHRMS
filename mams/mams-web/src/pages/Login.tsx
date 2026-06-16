import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { setFirstLoginSession } from '../lib/onboarding/session';
import { useAuth } from '../store/auth';

export function Login() {
  const [email, setEmail] = useState('hr.admin@makson-group.com');
  const [password, setPassword] = useState('makson2026');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const data = await authApi.login({ email, password });
      qc.removeQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      setAuth(data);
      if (data.isFirstLogin) {
        setFirstLoginSession();
      }
      navigate(data.user.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D1540] via-primary to-primary-light">
      <div className="bg-white rounded-2xl p-6 sm:p-12 w-full max-w-[420px] mx-4 shadow-2xl">
        <div className="text-[11px] tracking-[3px] uppercase text-red font-semibold mb-6">
          Makson Group of Companies
        </div>
        <h1 className="text-2xl font-bold text-primary mb-1">Attendance Management</h1>
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

        <div className="mt-6 p-3 bg-surface2 rounded-md text-[11px] text-text-subtle leading-relaxed">
          <strong>Demo credentials:</strong>
          <br />
          <code className="bg-border px-1.5 py-0.5 rounded text-[10px] font-mono">hr.admin@makson-group.com</code> for the real (12-hour) view
          <br />
          <code className="bg-border px-1.5 py-0.5 rounded text-[10px] font-mono">hr.compliance@makson-group.com</code> for the compliant (8-hour) view
          <br />
          Password: <code className="bg-border px-1.5 py-0.5 rounded text-[10px] font-mono">makson2026</code>
        </div>

        <div className="text-center mt-6 text-[11px] text-text-subtle">
          Powered by{' '}
          <a href="https://www.infoloop.co" className="text-primary-light font-semibold no-underline" target="_blank" rel="noreferrer">
            Infoloop Technologies
          </a>
        </div>
      </div>
    </div>
  );
}
