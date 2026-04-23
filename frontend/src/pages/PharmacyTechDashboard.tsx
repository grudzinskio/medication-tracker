import { AlertCircle, ClipboardList, Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { createRefill, getPrescriptions } from '../services/api';
import type { Prescription } from '../types';

type ModalState = { type: 'refill'; rx: Prescription } | null;

export default function PharmacyTechDashboard() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    getPrescriptions()
      .then(setPrescriptions)
      .catch(() => setError('Failed to load prescriptions.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter((rx) => {
      const haystack = [
        rx.PrescriptionID,
        rx.PatientID,
        rx.DoctorID,
        rx.PharmacyID,
        rx.Dosage,
        rx.Frequency ?? '',
        rx.StartDate,
        rx.EndDate ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [prescriptions, query]);

  async function submitRefill(rx: Prescription, data: { RefillDate: string; QuantityDispensed: number }) {
    await createRefill({
      PrescriptionID: rx.PrescriptionID,
      RefillDate: data.RefillDate,
      QuantityDispensed: data.QuantityDispensed,
    });
    setModal(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            <span>Fulfillment queue</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Pharmacy Tech</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Review prescriptions and record refills.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by Rx/Patient/Doctor/Pharmacy ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="text-xs text-slate-500">{prescriptions.length} total prescriptions</div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">Loading…</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-500">
              {query ? 'No prescriptions match your search.' : 'No prescriptions available.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className={thCls}>Rx</th>
                  <th className={thCls}>Patient</th>
                  <th className={thCls}>Doctor</th>
                  <th className={thCls}>Pharmacy</th>
                  <th className={thCls}>Dosage</th>
                  <th className={thCls}>Start</th>
                  <th className={thCls}>End</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((rx) => (
                  <tr key={rx.PrescriptionID} className="transition-colors hover:bg-slate-50">
                    <td className={tdCls}>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        #{rx.PrescriptionID}
                      </span>
                    </td>
                    <td className={tdCls}>#{rx.PatientID}</td>
                    <td className={tdCls}>#{rx.DoctorID}</td>
                    <td className={tdCls}>#{rx.PharmacyID}</td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-800">{rx.Dosage}</div>
                      <div className="text-xs text-slate-500">{rx.Frequency || '—'}</div>
                    </td>
                    <td className={tdCls}>
                      <span className="font-mono text-xs text-slate-600">{rx.StartDate}</span>
                    </td>
                    <td className={tdCls}>
                      <span className="font-mono text-xs text-slate-600">{rx.EndDate ?? '—'}</span>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        onClick={() => setModal({ type: 'refill', rx })}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                      >
                        <Plus className="h-4 w-4" />
                        Record refill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal?.type === 'refill' ? (
        <Modal title={`Record refill (Rx #${modal.rx.PrescriptionID})`} onClose={() => setModal(null)}>
          <RefillForm
            onCancel={() => setModal(null)}
            onSubmit={(data) => submitRefill(modal.rx, data)}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function RefillForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { RefillDate: string; QuantityDispensed: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [RefillDate, setRefillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [QuantityDispensed, setQuantityDispensed] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ RefillDate, QuantityDispensed });
    } catch {
      setError('Failed to record refill.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Refill date" required>
          <input
            type="date"
            required
            value={RefillDate}
            onChange={(e) => setRefillDate(e.target.value)}
            title="Refill date"
            className={inputCls}
          />
        </Field>
        <Field label="Quantity dispensed" required>
          <input
            type="number"
            min={1}
            required
            value={QuantityDispensed}
            onChange={(e) => setQuantityDispensed(Number(e.target.value))}
            title="Quantity dispensed"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={cancelBtnCls}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={primaryBtnCls}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Record refill'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';
const thCls = 'px-4 py-3 text-left';
const tdCls = 'px-4 py-3 text-slate-700';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60';
const cancelBtnCls =
  'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50';

