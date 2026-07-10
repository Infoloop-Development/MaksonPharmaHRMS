import { useState } from 'react';
import { adminBugReportingApi } from '../../../api/adminBugReporting';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BugReportExportModal({ open, onClose }: Props) {
  const toast = useToast((s) => s.push);
  const [raisedFrom, setRaisedFrom] = useState('');
  const [raisedTo, setRaisedTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const onDownload = async () => {
    setExporting(true);
    try {
      await adminBugReportingApi.exportXlsx({
        raisedFrom: raisedFrom || undefined,
        raisedTo: raisedTo || undefined,
      });
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report"
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void onDownload()}
            disabled={exporting}
          >
            {exporting ? 'Downloading…' : 'Download Report'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Start Date</label>
          <input
            type="date"
            className="input w-full h-9 text-sm"
            value={raisedFrom}
            onChange={(e) => setRaisedFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">End Date</label>
          <input
            type="date"
            className="input w-full h-9 text-sm"
            value={raisedTo}
            onChange={(e) => setRaisedTo(e.target.value)}
          />
          <p className="text-[11px] text-text-muted mt-1">Leave empty to include through today.</p>
        </div>
      </div>
    </Modal>
  );
}
