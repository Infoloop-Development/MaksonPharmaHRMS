import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MAKSON_DEPARTMENTS, MAKSON_FACTORY_LOCATIONS } from '@mams/types';
import {
  devicesApi,
  type Device,
  type DeviceCreate,
  type DeviceProtocolMode,
  type DeviceVendor,
} from '../../api/devices';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';

function emptyForm(): DeviceCreate {
  return {
    deviceCode: '',
    serialNumber: '',
    vendor: 'eSSL',
    protocolMode: 'push',
    model: 'eSSL SilkBio-101TC',
    name: '',
    department: MAKSON_DEPARTMENTS[0] ?? 'Admin',
    location: MAKSON_FACTORY_LOCATIONS[0] ?? 'Surendranagar, GJ',
    ipAddress: '',
    notes: '',
    integrationConfig: {},
  };
}

function formFromDevice(d: Device): DeviceCreate {
  return {
    deviceCode: d.deviceCode,
    serialNumber: d.serialNumber,
    vendor: d.vendor ?? 'eSSL',
    protocolMode: d.protocolMode ?? 'push',
    model: d.model,
    name: d.name,
    department: d.department ?? MAKSON_DEPARTMENTS[0] ?? 'Admin',
    location: d.location,
    ipAddress: d.ipAddress ?? '',
    notes: d.notes ?? '',
    integrationConfig: d.integrationConfig ?? {},
  };
}

export function DeviceRegisterModal({
  onClose,
  editDevice,
  onRegistered,
}: {
  onClose: () => void;
  editDevice?: Device | null;
  /** Called after successful create (not edit) with form data for post-register checklist. */
  onRegistered?: (registered: DeviceCreate) => void;
}) {
  const isEdit = !!editDevice;
  const [form, setForm] = useState<DeviceCreate>(editDevice ? formFromDevice(editDevice) : emptyForm());

  useEffect(() => {
    if (editDevice) setForm(formFromDevice(editDevice));
  }, [editDevice]);

  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      isEdit && editDevice
        ? devicesApi.update(editDevice._id, form)
        : devicesApi.create(form),
    onSuccess: () => {
      toast(isEdit ? 'Device updated' : 'Device registered', 'success');
      qc.invalidateQueries({ queryKey: ['devices'] });
      if (!isEdit && onRegistered) {
        onRegistered(form);
      }
      onClose();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast(msg, 'error');
    },
  });

  const isHanvon = form.vendor === 'Hanvon';
  const isPull = form.protocolMode === 'pull';
  const valid =
    form.deviceCode &&
    form.serialNumber &&
    form.model &&
    form.name &&
    form.department &&
    form.location &&
    (!isHanvon || isPull || (form.integrationConfig?.pushToken?.length ?? 0) >= 8) &&
    (!isHanvon || !isPull || !!form.integrationConfig?.pullBaseUrl);

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Device' : 'Register Device'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => mutation.mutate()}
            disabled={!valid || mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Register'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Vendor" required>
            <select
              className="input w-full"
              value={form.vendor}
              onChange={(e) => {
                const vendor = e.target.value as DeviceVendor;
                setForm({
                  ...form,
                  vendor,
                  model: vendor === 'Hanvon' ? 'Hanvon FaceID F710' : 'eSSL SilkBio-101TC',
                  protocolMode: 'push',
                });
              }}
            >
              <option value="eSSL">eSSL</option>
              <option value="Hanvon">Hanvon</option>
            </select>
          </Field>
          <Field label="Protocol" required>
            <select
              className="input w-full"
              value={form.protocolMode}
              onChange={(e) => setForm({ ...form, protocolMode: e.target.value as DeviceProtocolMode })}
              disabled={!isHanvon}
            >
              <option value="push">Push</option>
              {isHanvon && <option value="pull">Pull</option>}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Device Code" required hint="e.g., DEV-010">
            <Input value={form.deviceCode} onChange={(e) => setForm({ ...form, deviceCode: e.target.value })} />
          </Field>
          <Field label="Serial Number" required>
            <Input
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              disabled={isEdit}
            />
          </Field>
        </div>
        <Field label="Model" required>
          <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </Field>
        <Field label="Name (e.g., Main Gate Entry)" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Department" required>
            <select
              className="input w-full"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {MAKSON_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Factory location" required>
            <select
              className="input w-full"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            >
              {MAKSON_FACTORY_LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        {isHanvon && !isPull && (
          <Field label="Push token" required hint="X-Device-Token header value">
            <Input
              value={form.integrationConfig?.pushToken ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  integrationConfig: { ...form.integrationConfig, pushToken: e.target.value },
                })
              }
            />
          </Field>
        )}
        {isHanvon && isPull && (
          <>
            <Field label="Pull API base URL" required>
              <Input
                value={form.integrationConfig?.pullBaseUrl ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    integrationConfig: { ...form.integrationConfig, pullBaseUrl: e.target.value },
                  })
                }
                placeholder="http://192.168.0.250:8080"
              />
            </Field>
            <Field label="API key (optional)">
              <Input
                value={form.integrationConfig?.apiKey ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    integrationConfig: { ...form.integrationConfig, apiKey: e.target.value },
                  })
                }
              />
            </Field>
          </>
        )}
        <Field label="IP Address (optional)">
          <Input
            value={form.ipAddress ?? ''}
            onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
            placeholder="192.168.0.x"
          />
        </Field>
        <Field label="Notes (optional)">
          <Input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
