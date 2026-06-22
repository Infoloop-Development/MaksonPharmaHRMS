import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OrgBranding } from '@mams/types';
import { DEFAULT_ORG_BRANDING, normalizeOrgBranding } from '@mams/types';
import { settingsApi } from '../api/settings';
import { readCachedOrgBranding, cacheOrgBranding } from '../lib/orgBrandingCache';
import { applyBrandingToDocument } from '../lib/orgBrandingTheme';

function applyPersistedBranding(branding: OrgBranding): void {
  applyBrandingToDocument(branding);
  cacheOrgBranding(branding);
}

type OrgBrandingContextValue = {
  branding: OrgBranding;
  applyPreview: (next: OrgBranding) => void;
  revertPreview: () => void;
  commitBranding: (next: OrgBranding) => void;
};

const OrgBrandingContext = createContext<OrgBrandingContextValue | null>(null);

function initialBranding(): OrgBranding {
  return readCachedOrgBranding() ?? DEFAULT_ORG_BRANDING;
}

export function OrgBrandingProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });

  const committedRef = useRef<OrgBranding>(initialBranding());
  const [branding, setBranding] = useState<OrgBranding>(initialBranding);

  useLayoutEffect(() => {
    const cached = readCachedOrgBranding();
    if (cached) applyBrandingToDocument(cached);
  }, []);

  useEffect(() => {
    const next = normalizeOrgBranding(settings?.orgBranding ?? undefined);
    committedRef.current = next;
    setBranding(next);
    applyPersistedBranding(next);
  }, [settings?.orgBranding]);

  const applyPreview = useCallback((next: OrgBranding) => {
    applyBrandingToDocument(next);
  }, []);

  const revertPreview = useCallback(() => {
    applyBrandingToDocument(committedRef.current);
    setBranding(committedRef.current);
  }, []);

  const commitBranding = useCallback((next: OrgBranding) => {
    committedRef.current = next;
    setBranding(next);
    applyPersistedBranding(next);
  }, []);

  const value = useMemo(
    () => ({ branding, applyPreview, revertPreview, commitBranding }),
    [branding, applyPreview, revertPreview, commitBranding]
  );

  return <OrgBrandingContext.Provider value={value}>{children}</OrgBrandingContext.Provider>;
}

export function useOrgBranding() {
  const ctx = useContext(OrgBrandingContext);
  if (!ctx) throw new Error('useOrgBranding must be used within OrgBrandingProvider');
  return ctx;
}
