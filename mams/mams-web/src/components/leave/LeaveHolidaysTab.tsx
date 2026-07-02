import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HolidayCreate } from '@mams/types';
import { leaveApi } from '../../api/leave';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { fmtDate } from '../../lib/format';
import { HolidayFormModal, type HolidayRow } from './HolidayFormModal';
import { LeaveHolidayCardList } from './LeaveHolidayCardList';
import { SortableTh } from '../ui/SortableTh';
import { useTableSort } from '../../lib/tableSort';
import { tableColumnTooltip } from '../../lib/tooltips/tableColumnTooltips';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { BulkActionBar } from '../ui/BulkActionBar';
import { BulkConfirmModal } from '../ui/BulkConfirmModal';
import { BulkSelectCheckbox } from '../ui/BulkSelectCheckbox';

function parseHolidayCsv(text: string): HolidayCreate[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  const start = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
  const rows: HolidayCreate[] = [];
  for (let i = start; i < lines.length; i++) {
    const [name, date, typeRaw] = lines[i]!.split(',').map((s) => s.trim());
    if (!name || !date) continue;
    const type = (['National', 'Regional', 'Company'].includes(typeRaw ?? '') ? typeRaw : 'National') as HolidayCreate['type'];
    rows.push({ name, date, type, departments: [], locations: [] });
  }
  return rows;
}

export function LeaveHolidaysTab({ canConfigure }: { canConfigure: boolean }) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const year = String(new Date().getFullYear());
  const [addOpen, setAddOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<HolidayRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const bulk = useBulkSelection();

  const { data, isLoading } = useQuery({
    queryKey: ['leave', 'holidays', year],
    queryFn: () => leaveApi.listHolidays(year),
  });

  const holidayItems = data?.items ?? [];

  const getSortValue = useCallback((row: (typeof holidayItems)[number], col: string) => {
    if (col === 'name') return row.name;
    if (col === 'date') return row.date;
    if (col === 'type') return row.type;
    return '';
  }, []);

  const { sortCol, toggleSort, sortArrow, sortedRows } = useTableSort(holidayItems, getSortValue, { date: 'date' });
  const pageIds = useMemo(() => sortedRows.map((h) => h.id), [sortedRows]);
  const pageCheck = bulk.pageSelectionState(pageIds);
  const selectedHolidays = useMemo(
    () => sortedRows.filter((h) => bulk.isSelected(h.id)),
    [sortedRows, bulk]
  );

  useEffect(() => {
    bulk.clear();
  }, [year, sortCol]);

  const deleteMu = useMutation({
    mutationFn: (id: string) => leaveApi.deleteHoliday(id),
    onSuccess: () => {
      toast('Holiday removed', 'success');
      qc.invalidateQueries({ queryKey: ['leave', 'holidays'] });
    },
  });

  return (
    <div>
      {canConfigure && (
        <div className="card p-4 mb-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add holiday</button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setImportOpen(true)}>Import CSV</button>
        </div>
      )}

      {!isLoading && holidayItems.length === 0 && (
        <div className="card p-6 mb-4 text-center text-sm">
          <p className="font-semibold text-base mb-1">No holidays for {year}</p>
          {canConfigure ? (
            <>
              <p className="text-text-muted mb-4">
                Add national holidays so leave day counts exclude them automatically.
              </p>
              <button type="button" className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add first holiday</button>
            </>
          ) : (
            <p className="text-text-muted">An admin with Manage leave permission can add holidays here.</p>
          )}
        </div>
      )}

      {canConfigure && (
        <BulkActionBar
          count={bulk.count}
          overLimit={bulk.overLimit}
          actionLabel="Delete selected"
          onAction={() => setBulkDeleteOpen(true)}
          onClear={bulk.clear}
        />
      )}

      <LeaveHolidayCardList
        items={sortedRows}
        isLoading={isLoading}
        canConfigure={canConfigure}
        selectable={canConfigure}
        isSelected={bulk.isSelected}
        onToggleSelect={bulk.toggle}
        onEdit={setEditHoliday}
        onDelete={(h) => setDeleteTarget({ id: h.id, name: h.name })}
      />

      <div className="card tbl-scroll hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-subtle border-b bg-surface2/50">
              {canConfigure && (
                <th className="px-4 py-3 w-10">
                  <BulkSelectCheckbox
                    checked={pageCheck.allSelected && pageIds.length > 0}
                    indeterminate={pageCheck.someSelected}
                    onChange={() => bulk.togglePage(pageIds)}
                    ariaLabel="Select all holidays on this page"
                  />
                </th>
              )}
              <SortableTh label="Name" sortKey="name" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" tooltip={tableColumnTooltip('leave', 'name')} />
              <SortableTh label="Date" sortKey="date" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" tooltip={tableColumnTooltip('leave', 'date')} />
              <SortableTh label="Type" sortKey="type" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" tooltip={tableColumnTooltip('leave', 'type')} />
              <th className="px-4 py-3">Scope</th>
              {canConfigure && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={canConfigure ? 6 : 4} className="px-4 py-8 text-center text-text-muted">Loading…</td></tr>}
            {sortedRows.map((h) => (
              <tr key={h.id} className="border-b border-border/60">
                {canConfigure && (
                  <td className="px-4 py-3">
                    <BulkSelectCheckbox
                      checked={bulk.isSelected(h.id)}
                      onChange={() => bulk.toggle(h.id)}
                      ariaLabel={`Select ${h.name}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-medium">{h.name}</td>
                <td className="px-4 py-3">{fmtDate(h.date)}</td>
                <td className="px-4 py-3">{h.type}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {h.departments.length || h.locations.length
                    ? `${h.departments.join(', ') || 'All depts'} / ${h.locations.join(', ') || 'All locs'}`
                    : 'All employees'}
                </td>
                {canConfigure && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="btn-outline btn-sm" onClick={() => setEditHoliday(h)}>Edit</button>
                      <button type="button" className="btn-outline btn-sm text-red" onClick={() => setDeleteTarget({ id: h.id, name: h.name })}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <HolidayFormModal
          mode="create"
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            qc.invalidateQueries({ queryKey: ['leave', 'holidays'] });
            qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
          }}
        />
      )}

      {editHoliday && (
        <HolidayFormModal
          mode="edit"
          initial={editHoliday}
          onClose={() => setEditHoliday(null)}
          onSuccess={() => {
            setEditHoliday(null);
            qc.invalidateQueries({ queryKey: ['leave', 'holidays'] });
          }}
        />
      )}

      <BulkConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete holiday?"
        description={
          deleteTarget ? (
            <>
              Remove holiday <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete holiday"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMu.mutateAsync(deleteTarget.id);
        }}
      />

      <BulkConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Delete selected holidays?"
        description={
          <>
            Delete <strong>{bulk.count}</strong> holiday{bulk.count !== 1 ? 's' : ''}? This cannot be undone.
          </>
        }
        itemLabels={selectedHolidays.map((h) => `${h.name} (${fmtDate(h.date)})`)}
        confirmLabel="Delete holidays"
        onConfirm={async () => {
          const result = await leaveApi.bulkDeleteHolidays(bulk.ids);
          toast(
            `Deleted ${result.succeeded} holiday${result.succeeded !== 1 ? 's' : ''}${
              result.skipped ? `, ${result.skipped} skipped` : ''
            }`,
            result.succeeded > 0 ? 'success' : 'error'
          );
          qc.invalidateQueries({ queryKey: ['leave', 'holidays'] });
          bulk.clear();
          return result;
        }}
      />

      {importOpen && (
        <Modal
          open
          title="Import holidays from CSV"
          onClose={() => setImportOpen(false)}
          size="md"
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setImportOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={!importFile || importBusy}
                onClick={async () => {
                  if (!importFile) return;
                  setImportBusy(true);
                  try {
                    const rows = parseHolidayCsv(await importFile.text());
                    if (rows.length === 0) {
                      toast('No valid rows in CSV', 'error');
                      return;
                    }
                    const res = await leaveApi.importHolidaysCsv(rows);
                    toast(`Imported ${res.imported} holiday(s)`, 'success');
                    setImportOpen(false);
                    setImportFile(null);
                    qc.invalidateQueries({ queryKey: ['leave', 'holidays'] });
                    qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
                  } catch (e: unknown) {
                    toast(e instanceof Error ? e.message : 'Import failed', 'error');
                  } finally {
                    setImportBusy(false);
                  }
                }}
              >
                {importBusy ? 'Importing…' : 'Import'}
              </button>
            </>
          }
        >
          <p className="text-sm text-text-muted">
            CSV columns: <code className="font-mono text-xs">name, date, type</code> (National, Regional, or Company). Header row optional.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm mt-3"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
        </Modal>
      )}
    </div>
  );
}
