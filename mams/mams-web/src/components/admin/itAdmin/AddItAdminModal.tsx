import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '../../ui/Modal';
import { Field, Input } from '../../ui/Field';
import { itAdminsApi } from '../../../api/itAdmins';
import { ApiError } from '../../../api/client';
import type { ItAdminCreateResponse } from '@mams/types';

type FieldErrors = { name?: string; email?: string };

function validateForm(name: string, email: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = 'Name is required';
  if (!email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email';
  return errors;
}

export function AddItAdminModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: ItAdminCreateResponse) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: () =>
      itAdminsApi.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      }),
    onSuccess: (result) => {
      onCreated(result);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(name, email);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    mutation.mutate();
  };

  const apiError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Create failed' : null;

  return (
    <Modal open title="Add IT Admin" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" error={fieldErrors.name} required>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
            }}
            autoFocus
          />
        </Field>
        <Field label="Email" error={fieldErrors.email} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
          />
        </Field>
        {apiError && <p className="text-sm text-red">{apiError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
