import {
  AlertCircle,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import {
  createPatient,
  deletePatient,
  getPatients,
  updatePatient,
} from '../services/api';
import type { CreatePatientPayload, Patient } from '../types';

// ─── Patient form ─────────────────────────────────────────────────────────────

interface FormState {
  FirstName: string;
  LastName: string;
  Email: string;
}

const emptyForm: FormState = { FirstName: '', LastName: '', Email: '' };

interface PatientFormProps {
  initial?: FormState;
  onSubmit: (data: FormState) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function PatientForm({ initial = emptyForm, onSubmit, onCancel, submitLabel }: PatientFormProps) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
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
        <Field label="First Name" required>
          <input
            type="text"
            required
            value={form.FirstName}
            onChange={set('FirstName')}
            placeholder="Alice"
            className={inputCls}
          />
        </Field>
        <Field label="Last Name" required>
          <input
            type="text"
            required
            value={form.LastName}
            onChange={set('LastName')}
            placeholder="Johnson"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Email" required>
        <input
          type="email"
          required
          value={form.Email}
          onChange={set('Email')}
          placeholder="alice@example.com"
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

// ─── Patients page ────────────────────────────────────────────────────────────

type ModalMode = { type: 'add' } | { type: 'edit'; patient: Patient } | { type: 'delete'; patient: Patient };

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(() => setError('Failed to load patients.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return patients.filter(
      (p) =>
        p.FirstName.toLowerCase().includes(q) ||
        p.LastName.toLowerCase().includes(q) ||
        p.Email.toLowerCase().includes(q),
    );
  }, [patients, query]);

  async function handleAdd(data: FormState) {
    const payload: CreatePatientPayload = data;
    const created = await createPatient(payload);
    setPatients((prev) => [...prev, created]);
    setModal(null);
  }

  async function handleEdit(patient: Patient, data: FormState) {
    const updated = await updatePatient(patient.PatientID, data);
    setPatients((prev) =>
      prev.map((p) => (p.PatientID === updated.PatientID ? updated : p)),
    );
    setModal(null);
  }

  async function handleDelete(patient: Patient) {
    setDeleteLoading(true);
    try {
      await deletePatient(patient.PatientID);
      setPatients((prev) => prev.filter((p) => p.PatientID !== patient.PatientID));
      setModal(null);
    } catch {
      setError('Failed to delete patient.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {patients.length} patient{patients.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className={primaryBtnCls}>
          <Plus className="h-4 w-4" />
          Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search patients…"
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
              <UserRound className="h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-500">
                {query ? 'No patients match your search.' : 'No patients yet — add one to get started.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Email</th>
                  <th className={thCls}>ID</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.PatientID} className="group transition-colors hover:bg-slate-50">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">
                          {p.FirstName[0]}{p.LastName[0]}
                        </div>
                        <span className="font-medium text-slate-900">
                          {p.FirstName} {p.LastName}
                        </span>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <a
                        href={`mailto:${p.Email}`}
                        className="flex items-center gap-1.5 text-slate-500 hover:text-teal-600"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {p.Email}
                      </a>
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                        #{p.PatientID}
                      </span>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <IconBtn
                          label="Edit patient"
                          onClick={() => setModal({ type: 'edit', patient: p })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          label="Delete patient"
                          danger
                          onClick={() => setModal({ type: 'delete', patient: p })}
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
        <Modal title="Add Patient" onClose={() => setModal(null)}>
          <PatientForm
            onSubmit={handleAdd}
            onCancel={() => setModal(null)}
            submitLabel="Add Patient"
          />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Edit Patient" onClose={() => setModal(null)}>
          <PatientForm
            initial={{
              FirstName: modal.patient.FirstName,
              LastName: modal.patient.LastName,
              Email: modal.patient.Email,
            }}
            onSubmit={(data) => handleEdit(modal.patient, data)}
            onCancel={() => setModal(null)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Delete Patient" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-slate-900">
              {modal.patient.FirstName} {modal.patient.LastName}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className={cancelBtnCls}>
              Cancel
            </button>
            <button
              onClick={() => handleDelete(modal.patient)}
              disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
