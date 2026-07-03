import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicOrgApi } from '../api/publicOrg';
import { applyBrandingToDocument } from '../lib/orgBrandingTheme';
import { cacheOrgBranding } from '../lib/orgBrandingCache';

const FALLBACK_COMPANY_NAME = 'Makson Group';

export function usePublicOrgBranding() {
  const query = useQuery({
    queryKey: ['public-org-branding'],
    queryFn: () => publicOrgApi.getBranding(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!query.data) return;
    applyBrandingToDocument(query.data.orgBranding);
    cacheOrgBranding(query.data.orgBranding);

    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (query.data.favicon) {
      link.href = query.data.favicon;
      link.type = query.data.favicon.includes('svg') ? 'image/svg+xml' : 'image/png';
    }
  }, [query.data]);

  return {
    companyName: query.data?.companyName ?? FALLBACK_COMPANY_NAME,
    companyLogo: query.data?.companyLogo ?? null,
    isLoading: query.isLoading,
  };
}
