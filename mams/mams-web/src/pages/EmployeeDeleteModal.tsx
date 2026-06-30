import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { EmployeeMasked, EmployeeUnmasked } from '@mams/types';
import { employeesApi } from '../api/employees';
import { ApiError } from '../api/client';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';

export function EmployeeDeleteModal({
  employee,
  onClose,
  redirectOnSuccess = false,
}: {
  employee: EmployeeMasked | EmployeeUnmasked;
  onClose: () => void;
  redirectOnSuccess?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const onConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await employeesApi.delete(employee.id);
      toast(`Deleted ${employee.name}`, 'success');
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee', employee.id] });
      qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      onClose();
      if (redirectOnSuccess) navigate('/employees');
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Could not delete employee.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete employee?"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary bg-red hover:bg-red/90" disabled={busy} onClick={onConfirm}>
            {busy ? 'Deleting…' : 'Delete employee'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted">
        Delete employee <strong className="text-text">{employee.name}</strong> ({employee.empCode})? This cannot be
        undone.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
