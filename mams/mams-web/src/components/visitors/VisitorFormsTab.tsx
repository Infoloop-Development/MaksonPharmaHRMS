import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { visitorsApi, type VisitorFormItem } from '../../api/visitors';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Badge';
import { FormBuilder } from './FormBuilder';
import { FormQrActions } from './FormQrActions';
import { FormResponsesPanel } from './FormResponsesPanel';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { BulkActionBar } from '../ui/BulkActionBar';
import { BulkConfirmModal } from '../ui/BulkConfirmModal';
import { BulkSelectCheckbox } from '../ui/BulkSelectCheckbox';

export function VisitorFormsTab({ onViewRequest }: { onViewRequest: (id: string) => void }) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const [builderForm, setBuilderForm] = useState<VisitorFormItem | null | 'new'>(null);
  const [expandedResponsesFormId, setExpandedResponsesFormId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<VisitorFormItem | null>(null);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const bulk = useBulkSelection();

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', 'forms'],
    queryFn: visitorsApi.listForms,
  });

  const toggleMu = useMutation({
    mutationFn: (id: string) => visitorsApi.toggleFormActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors', 'forms'] });
      toast('Form status updated', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deleteMu = useMutation({
    mutationFn: (id: string) => visitorsApi.deleteForm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors', 'forms'] });
      toast('Form archived', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const items = data?.items ?? [];
  const pageIds = useMemo(() => items.map((f) => f._id), [items]);
  const pageCheck = bulk.pageSelectionState(pageIds);
  const selectedForms = useMemo(
    () => items.filter((f) => bulk.isSelected(f._id)),
    [items, bulk]
  );

  useEffect(() => {
    bulk.clear();
  }, [items.length]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Visitor forms</h2>
          <p className="text-sm text-text-muted">Create forms, share public links, and print QR codes for reception desks.</p>
        </div>
        <button type="button" className="btn bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold" onClick={() => setBuilderForm('new')}>
          Create form
        </button>
      </div>

      {items.length > 0 && (
        <>
          <BulkActionBar
            count={bulk.count}
            overLimit={bulk.overLimit}
            actionLabel="Archive selected"
            onAction={() => setBulkArchiveOpen(true)}
            onClear={bulk.clear}
          />
          <div className="mb-3 flex items-center gap-2 text-sm text-text-muted">
            <BulkSelectCheckbox
              checked={pageCheck.allSelected && pageIds.length > 0}
              indeterminate={pageCheck.someSelected}
              onChange={() => bulk.togglePage(pageIds)}
              ariaLabel="Select all visitor forms"
            />
            <span>Select all forms</span>
          </div>
        </>
      )}

      {isLoading && <p className="text-text-muted text-sm">Loading forms…</p>}
      {!isLoading && items.length === 0 && (
        <div className="card p-12 text-center text-text-muted">
          No visitor forms yet. Create one to generate a public link and QR code.
        </div>
      )}

      <div className="space-y-4">
        {items.map((form) => (
          <div key={form._id} className="card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 min-w-0">
                <BulkSelectCheckbox
                  checked={bulk.isSelected(form._id)}
                  onChange={() => bulk.toggle(form._id)}
                  ariaLabel={`Select ${form.title}`}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">{form.title}</h3>
                    <Badge tone={form.isActive ? 'green' : 'gray'}>{form.isActive ? 'Active' : 'Inactive'}</Badge>
                    <span className="text-xs text-text-muted">v{form.formVersion}</span>
                  </div>
                  {form.description && <p className="text-sm text-text-muted mt-1">{form.description}</p>}
                  <p className="text-xs text-text-muted mt-1">{form.submissionCount} submission(s)</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`text-sm ${expandedResponsesFormId === form._id ? 'btn bg-primary text-white' : 'btn-outline'}`}
                  onClick={() =>
                    setExpandedResponsesFormId((id) => (id === form._id ? null : form._id))
                  }
                >
                  Responses
                </button>
                <button type="button" className="btn-outline text-sm" onClick={() => setBuilderForm(form)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-outline text-sm"
                  onClick={() => toggleMu.mutate(form._id)}
                  disabled={toggleMu.isPending}
                >
                  {form.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  className="btn-outline text-sm text-red"
                  onClick={() => setArchiveTarget(form)}
                  disabled={deleteMu.isPending}
                >
                  Archive
                </button>
              </div>
            </div>
            <FormQrActions title={form.title} publicUrl={form.publicUrl} compact />
            {expandedResponsesFormId === form._id && (
              <FormResponsesPanel form={form} onViewRequest={onViewRequest} />
            )}
          </div>
        ))}
      </div>

      <BulkConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive form?"
        description={
          archiveTarget ? (
            <>
              Archive <strong>{archiveTarget.title}</strong>? The public link will stop working.
            </>
          ) : null
        }
        confirmLabel="Archive form"
        onConfirm={async () => {
          if (!archiveTarget) return;
          await deleteMu.mutateAsync(archiveTarget._id);
        }}
      />

      <BulkConfirmModal
        open={bulkArchiveOpen}
        onClose={() => setBulkArchiveOpen(false)}
        title="Archive selected forms?"
        description={
          <>
            Archive <strong>{bulk.count}</strong> form{bulk.count !== 1 ? 's' : ''}? Public links will stop working.
          </>
        }
        itemLabels={selectedForms.map((f) => f.title)}
        confirmLabel="Archive forms"
        onConfirm={async () => {
          const result = await visitorsApi.bulkArchiveForms(bulk.ids);
          toast(
            `Archived ${result.succeeded} form${result.succeeded !== 1 ? 's' : ''}${
              result.skipped ? `, ${result.skipped} skipped` : ''
            }`,
            result.succeeded > 0 ? 'success' : 'error'
          );
          qc.invalidateQueries({ queryKey: ['visitors', 'forms'] });
          bulk.clear();
          return result;
        }}
      />

      {builderForm && (
        <FormBuilder
          initial={builderForm === 'new' ? undefined : builderForm}
          onClose={() => setBuilderForm(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['visitors', 'forms'] })}
        />
      )}
    </div>
  );
}
