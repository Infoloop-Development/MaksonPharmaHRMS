import { Component, type ErrorInfo, type ReactNode } from 'react';
import { THEME_STORAGE_KEY } from '../../lib/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

function clearSessionStorage(): void {
  try {
    sessionStorage.removeItem('mams-auth');
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[MAMS] Uncaught render error:', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1540] p-6">
        <div className="max-w-lg w-full rounded-xl border border-white/20 bg-white p-6 shadow-2xl">
          <h1 className="text-lg font-bold text-[#1A2878]">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">
            The app hit an error while loading. This is often caused by stale browser storage or a
            dev server that needs a restart.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-gray-100 p-3 text-xs text-red-700 whitespace-pre-wrap">
            {error.message}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-[#1A2878] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => {
                clearSessionStorage();
                window.location.href = '/login';
              }}
            >
              Clear session &amp; reload
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Dev tip: from the <code className="rounded bg-gray-100 px-1">mams</code> folder run{' '}
            <code className="rounded bg-gray-100 px-1">.\start-local.ps1</code>
          </p>
        </div>
      </div>
    );
  }
}
