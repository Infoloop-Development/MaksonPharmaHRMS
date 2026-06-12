import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { visitorsApi, type VisitorFormItem } from '../../api/visitors';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Badge';
import { FormBuilder } from './FormBuilder';
import { FormQrActions } from './FormQrActions';

export function VisitorFormsTab() {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const [builderForm, setBuilderForm] = useState<VisitorFormItem | null | 'new'>(null);

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

      {isLoading && <p className="text-text-muted text-sm">Loading forms…</p>}
      {!isLoading && items.length === 0 && (
        <div className="card p-12 text-center text-text-muted">
          No visitor forms yet. Create one to generate a public link and QR code.
        </div>
      )}

      <div className="space-y-4">
        {items.map((form) => (
          <div key={form._id} className="card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">{form.title}</h3>
                  <Badge tone={form.isActive ? 'green' : 'gray'}>{form.isActive ? 'Active' : 'Inactive'}</Badge>
                  <span className="text-xs text-text-muted">v{form.formVersion}</span>
                </div>
                {form.description && <p className="text-sm text-text-muted mt-1">{form.description}</p>}
                <p className="text-xs text-text-muted mt-1">{form.submissionCount} submission(s)</p>
              </div>
              <div className="flex flex-wrap gap-2">
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
                  onClick={() => {
                    if (window.confirm(`Archive "${form.title}"? The public link will stop working.`)) {
                      deleteMu.mutate(form._id);
                    }
                  }}
                  disabled={deleteMu.isPending}
                >
                  Archive
                </button>
              </div>
            </div>
            <FormQrActions title={form.title} publicUrl={form.publicUrl} compact />
          </div>
        ))}
      </div>

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
