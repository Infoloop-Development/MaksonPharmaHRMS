import { useState, useEffect } from 'react';
import { canApproveVisitors, canManageVisitorForms, canViewVisitors } from '@mams/types';
import { useAuth } from '../store/auth';
import { VisitorsTabBar } from '../components/visitors/VisitorsTabBar';
import { VisitorRequestsTab } from '../components/visitors/VisitorRequestsTab';
import { VisitorFormsTab } from '../components/visitors/VisitorFormsTab';
import { VisitorRequestDetailModal } from '../components/visitors/VisitorRequestDetailModal';
import type { VisitorTab } from '../components/visitors/visitorsUtils';

export function Visitors() {
  const perms = useAuth((s) => s.user?.permissions ?? []);
  const canView = canViewVisitors(perms);
  const canApprove = canApproveVisitors(perms);
  const canManageForms = canManageVisitorForms(perms);

  const [tab, setTab] = useState<VisitorTab>('requests');
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageForms && tab === 'forms') setTab('requests');
    if (!canView && canManageForms && tab === 'requests') setTab('forms');
  }, [canManageForms, canView, tab]);

  if (!canView && !canManageForms) {
    return (
      <div className="card p-12 text-center text-text-muted">
        You do not have permission to access visitor management. Ask an admin for{' '}
        <em>View visitors</em>, <em>Approve visitors</em>, or <em>Manage visitor forms</em> in Settings → Users.
      </div>
    );
  }

  const activeTab = tab === 'forms' && !canManageForms ? 'requests' : tab === 'requests' && !canView ? 'forms' : tab;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Visitors</h1>
        <p className="text-sm text-text-muted mt-1">
          Review visitor requests and manage public registration forms with shareable links and QR codes.
        </p>
      </div>

      <VisitorsTabBar
        tab={activeTab}
        onTabChange={setTab}
        canManageForms={canManageForms}
        canViewRequests={canView}
      />

      {activeTab === 'requests' && canView && (
        <VisitorRequestsTab canApprove={canApprove} onView={(id) => setDetailId(id)} />
      )}
      {activeTab === 'forms' && canManageForms && <VisitorFormsTab />}

      {detailId && (
        <VisitorRequestDetailModal
          requestId={detailId}
          onClose={() => setDetailId(null)}
          canApprove={canApprove}
        />
      )}
    </div>
  );
}
