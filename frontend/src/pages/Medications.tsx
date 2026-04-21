import {
  AlertCircle,
  Loader2,
  Pencil,
  Pill,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import {
  createMedication,
  deleteMedication,
  getMedications,
  updateMedication,
} from '../services/api';
import type { CreateMedicationPayload, Medication } from '../types';

/**
 * Multi-component drugs (e.g. vaccines) store one unit per active ingredient
 * separated by semicolons. Show only the first component + a count badge when
 * there are multiple so the table cell stays readable.
 */
function formatUnit(unitType: string | null | undefined): string {
  if (!unitType) return '—';
  const parts = unitType.split(';').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return unitType;
  return `${parts[0]} ×${parts.length}`;
}

// ─── Medication form ──────────────────────────────────────────────────────────

interface FormState {
  DrugName: string;
  GenericName: string;
  Form: string;
  Route: string;
  Manufacturer: string;
  UnitType: string;
}

const emptyForm: FormState = {
  DrugName: '',
  GenericName: '',
  Form: '',
  Route: '',
  Manufacturer: '',
  UnitType: '',
};

const FORM_OPTIONS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Patch', 'Inhaler', 'Cream', 'Other'];
const ROUTE_OPTIONS = ['Oral', 'Topical', 'IV', 'IM', 'Subcutaneous', 'Inhalation', 'Transdermal', 'Other'];
const UNIT_OPTIONS = ['mg', 'mcg', 'g', 'mL', 'unit', 'IU', '%'];

interface MedicationFormProps {
  initial?: FormState;
  onSubmit: (data: FormState) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function MedicationForm({ initial = emptyForm, onSubmit, onCancel, submitLabel }: MedicationFormProps) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch {
      setError('Something went wrong. Please try again.');
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
        <Field label="Drug Name" required>
          <input
            type="text"
            required
            value={form.DrugName}
            onChange={set('DrugName')}
            placeholder="Lisinopril"
            className={inputCls}
          />
        </Field>
        <Field label="Generic Name" required>
          <input
            type="text"
            required
            value={form.GenericName}
            onChange={set('GenericName')}
            placeholder="Lisinopril"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Form" required>
          <select aria-label="Form" required value={form.Form} onChange={set('Form')} className={inputCls}>
            <option value="" disabled>Select…</option>
            {FORM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Route" required>
          <select aria-label="Route" required value={form.Route} onChange={set('Route')} className={inputCls}>
            <option value="" disabled>Select…</option>
            {ROUTE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Unit Type" required>
          <select aria-label="Unit Type" required value={form.UnitType} onChange={set('UnitType')} className={inputCls}>
            <option value="" disabled>Select…</option>
            {UNIT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Manufacturer">
        <input
          type="text"
          value={form.Manufacturer}
          onChange={set('Manufacturer')}
          placeholder="PharmaCorp"
          className={inputCls}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={cancelBtnCls}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={primaryBtnCls}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Medications page ─────────────────────────────────────────────────────────

type ModalMode =
  | { type: 'add' }
  | { type: 'edit'; medication: Medication }
  | { type: 'delete'; medication: Medication };

export default function Medications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getMedications()
      .then(setMedications)
      .catch(() => setError('Failed to load medications.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return medications.filter(
      (m) =>
        m.DrugName.toLowerCase().includes(q) ||
        m.GenericName.toLowerCase().includes(q) ||
        m.Manufacturer.toLowerCase().includes(q) ||
        m.Form.toLowerCase().includes(q),
    );
  }, [medications, query]);

  async function handleAdd(data: FormState) {
    const payload: CreateMedicationPayload = data;
    const created = await createMedication(payload);
    setMedications((prev) => [...prev, created]);
    setModal(null);
  }

  async function handleEdit(med: Medication, data: FormState) {
    const updated = await updateMedication(med.MedID, data);
    setMedications((prev) =>
      prev.map((m) => (m.MedID === updated.MedID ? updated : m)),
    );
    setModal(null);
  }

  async function handleDelete(med: Medication) {
    setDeleteLoading(true);
    try {
      await deleteMedication(med.MedID);
      setMedications((prev) => prev.filter((m) => m.MedID !== med.MedID));
      setModal(null);
    } catch {
      setError('Failed to delete medication.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Medications</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {medications.length} medication{medications.length !== 1 ? 's' : ''} in catalog
          </p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className={primaryBtnCls}>
          <Plus className="h-4 w-4" />
          Add Medication
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search medications…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} pl-9`}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">Loading…</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Pill className="h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-500">
                {query
                  ? 'No medications match your search.'
                  : 'No medications yet — add one to get started.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={thCls}>Drug Name</th>
                  <th className={thCls}>Form · Route</th>
                  <th className={thCls}>Unit</th>
                  <th className={thCls}>Manufacturer</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <tr key={m.MedID} className="group transition-colors hover:bg-slate-50">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50">
                          <Pill className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{m.DrugName}</p>
                          {m.GenericName !== m.DrugName && (
                            <p className="text-xs text-slate-400">{m.GenericName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {m.Form}
                      </span>
                      <span className="mx-1 text-slate-300">·</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {m.Route}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="font-mono text-xs text-slate-500" title={m.UnitType || undefined}>
                        {formatUnit(m.UnitType)}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="text-slate-500">{m.Manufacturer || '—'}</span>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <IconBtn
                          label="Edit medication"
                          onClick={() => setModal({ type: 'edit', medication: m })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          label="Delete medication"
                          danger
                          onClick={() => setModal({ type: 'delete', medication: m })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {modal?.type === 'add' && (
        <Modal title="Add Medication" onClose={() => setModal(null)} size="max-w-xl">
          <MedicationForm
            onSubmit={handleAdd}
            onCancel={() => setModal(null)}
            submitLabel="Add Medication"
          />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Edit Medication" onClose={() => setModal(null)} size="max-w-xl">
          <MedicationForm
            initial={{
              DrugName: modal.medication.DrugName,
              GenericName: modal.medication.GenericName,
              Form: modal.medication.Form,
              Route: modal.medication.Route,
              Manufacturer: modal.medication.Manufacturer,
              UnitType: modal.medication.UnitType,
            }}
            onSubmit={(data) => handleEdit(modal.medication, data)}
            onCancel={() => setModal(null)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Delete Medication" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-slate-900">{modal.medication.DrugName}</span> from
            the catalog? This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className={cancelBtnCls}>
              Cancel
            </button>
            <button
              onClick={() => handleDelete(modal.medication)}
              disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {deleteLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />}
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared micro-components & style constants ────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function IconBtn({
  label, danger = false, onClick, children,
}: {
  label: string; danger?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={[
        'rounded-lg p-1.5 transition-colors',
        danger
          ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';

const thCls = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500';
const tdCls = 'px-4 py-3 text-sm text-slate-600';

const primaryBtnCls =
  'inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60';
const cancelBtnCls =
  'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50';
