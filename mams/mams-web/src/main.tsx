import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ThemeProvider } from './store/theme';
import { OrgBrandingProvider } from './store/orgBranding';
import { bootstrapOrgBrandingFromCache } from './lib/orgBrandingCache';
import './styles/index.css';

bootstrapOrgBrandingFromCache();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <OrgBrandingProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </OrgBrandingProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
