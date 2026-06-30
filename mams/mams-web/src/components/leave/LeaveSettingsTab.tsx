import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LeaveQuotaResetPolicy } from '@mams/types';
import { leaveApi, type LeaveTypeItem } from '../../api/leave';
import { useToast } from '../ui/Toast';
import { Field, Input, Select } from '../ui/Field';
import { LeaveTypeFormModal } from './LeaveTypeFormModal';
import { LeaveTypeCardList } from './LeaveTypeCardList';
import { SortableTh } from '../ui/SortableTh';
import { useTableSort } from '../../lib/tableSort';

export function LeaveSettingsTab({ canConfigure }: { canConfigure: boolean }) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const { data: types } = useQuery({ queryKey: ['leave', 'types'], queryFn: leaveApi.listTypes });
  const { data: policy } = useQuery({ queryKey: ['leave', 'policy'], queryFn: leaveApi.getPolicy });

  const [resetPolicy, setResetPolicy] = useState<LeaveQuotaResetPolicy>('calendar_year');
  const [fyMonth, setFyMonth] = useState(4);
  const [editType, setEditType] = useState<LeaveTypeItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (policy) {
      setResetPolicy(policy.leaveQuotaResetPolicy);
      setFyMonth(policy.financialYearStartMonth);
    }
  }, [policy]);

  const seedMu = useMutation({
    mutationFn: () => leaveApi.seedDefaultTypes(),
    onSuccess: (r) => {
      toast(`Seeded ${r.seeded} leave types`, 'success');
      qc.invalidateQueries({ queryKey: ['leave', 'types'] });
    },
  });

  const policyMu = useMutation({
    mutationFn: () => leaveApi.patchPolicy({ leaveQuotaResetPolicy: resetPolicy, financialYearStartMonth: fyMonth }),
    onSuccess: () => toast('Policy saved', 'success'),
  });

  const typeItems = types?.items ?? [];
  const getTypeSortValue = useCallback((row: LeaveTypeItem, col: string) => {
    if (col === 'name') return row.name;
    if (col === 'annualQuotaDefault') return row.annualQuotaDefault;
    if (col === 'paid') return row.paid ? '1' : '0';
    if (col === 'halfDayEligible') return row.halfDayEligible ? '1' : '0';
    if (col === 'active') return row.active ? '1' : '0';
    return '';
  }, []);
  const { sortCol, toggleSort, sortArrow, sortedRows: sortedTypes } = useTableSort(typeItems, getTypeSortValue, {
    annualQuotaDefault: 'number',
  });

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="text-base font-bold mb-1">Quota reset policy</h3>
        <p className="text-sm text-text-muted mb-4">Controls how annual leave entitlements are calculated per employee.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <Field label="Reset cycle">
            <Select value={resetPolicy} disabled={!canConfigure} onChange={(e) => setResetPolicy(e.target.value as LeaveQuotaResetPolicy)}>
              <option value="calendar_year">Calendar year</option>
              <option value="financial_year">Financial year</option>
              <option value="joining_anniversary">Joining anniversary</option>
            </Select>
          </Field>
          <Field label="FY start month (1–12)">
            <Input type="number" min={1} max={12} value={fyMonth} disabled={!canConfigure} onChange={(e) => setFyMonth(Number(e.target.value))} />
          </Field>
        </div>
        {canConfigure && (
          <button type="button" className="btn-primary btn-sm mt-4" onClick={() => policyMu.mutate()} disabled={policyMu.isPending}>
            {policyMu.isPending ? 'Saving…' : 'Save policy'}
          </button>
        )}
      </div>

      <div className="card p-5">
        <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
          <div>
            <h3 className="text-base font-bold">Leave types</h3>
            <p className="text-sm text-text-muted">Paid leave, casual, sick, LWP, and custom types.</p>
          </div>
          {canConfigure && (
            <div className="flex gap-2">
              {(types?.items.length ?? 0) === 0 && (
                <button type="button" className="btn-outline btn-sm" onClick={() => seedMu.mutate()} disabled={seedMu.isPending}>
                  Seed defaults
                </button>
              )}
              <button type="button" className="btn-primary btn-sm" onClick={() => setCreateOpen(true)}>+ Add type</button>
            </div>
          )}
        </div>
        <LeaveTypeCardList
          items={sortedTypes}
          canConfigure={canConfigure}
          onEdit={setEditType}
        />
        <div className="tbl-scroll border border-border rounded-md hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-subtle border-b bg-surface2/50">
                <SortableTh label="Name" sortKey="name" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
                <SortableTh label="Paid" sortKey="paid" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
                <SortableTh label="Half day" sortKey="halfDayEligible" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
                <SortableTh label="Default quota" sortKey="annualQuotaDefault" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
                <SortableTh label="Active" sortKey="active" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
                {canConfigure && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {(types?.items ?? []).length === 0 && (
                <tr><td colSpan={canConfigure ? 6 : 5} className="px-4 py-8 text-center text-text-muted">No leave types. Seed defaults to get started.</td></tr>
              )}
              {sortedTypes.map((t) => (
                <tr key={t.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">{t.paid ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">{t.halfDayEligible ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 font-mono">{t.annualQuotaDefault}</td>
                  <td className="px-4 py-3">{t.active ? 'Yes' : 'No'}</td>
                  {canConfigure && (
                    <td className="px-4 py-3">
                      <button type="button" className="btn-outline btn-sm" onClick={() => setEditType(t)}>Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editType && (
        <LeaveTypeFormModal
          mode="edit"
          initial={editType}
          onClose={() => setEditType(null)}
          onSuccess={() => {
            setEditType(null);
            qc.invalidateQueries({ queryKey: ['leave', 'types'] });
          }}
        />
      )}
      {createOpen && (
        <LeaveTypeFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            qc.invalidateQueries({ queryKey: ['leave', 'types'] });
          }}
        />
      )}
    </div>
  );
}
