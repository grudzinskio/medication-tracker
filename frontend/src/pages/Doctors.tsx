import {
  AlertCircle,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Search,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { createDoctor, deleteDoctor, getDoctors, updateDoctor } from '../services/api';
import type { CreateDoctorPayload, Doctor } from '../types';

interface FormState {
  FirstName: string;
  LastName: string;
  Specialty: string;
  ContactNumber: string;
}

const emptyForm: FormState = { FirstName: '', LastName: '', Specialty: '', ContactNumber: '' };

interface DoctorFormProps {
  initial?: FormState;
  onSubmit: (data: FormState) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function DoctorForm({ initial = emptyForm, onSubmit, onCancel, submitLabel }: DoctorFormProps) {
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
          <input type="text" required value={form.FirstName} onChange={set('FirstName')}
            placeholder="Sarah" className={inputCls} />
        </Field>
        <Field label="Last Name" required>
          <input type="text" required value={form.LastName} onChange={set('LastName')}
            placeholder="Patel" className={inputCls} />
        </Field>
      </div>
      <Field label="Specialty">
        <input type="text" value={form.Specialty} onChange={set('Specialty')}
          placeholder="Cardiology" className={inputCls} />
      </Field>
      <Field label="Contact Number">
        <input type="text" value={form.ContactNumber} onChange={set('ContactNumber')}
          placeholder="555-0101" className={inputCls} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={cancelBtnCls}>Cancel</button>
        <button type="submit" disabled={saving} className={primaryBtnCls}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

type ModalMode = { type: 'add' } | { type: 'edit'; doctor: Doctor } | { type: 'delete'; doctor: Doctor };

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(() => setError('Failed to load doctors.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return doctors.filter(
      (d) =>
        d.FirstName.toLowerCase().includes(q) ||
        d.LastName.toLowerCase().includes(q) ||
        (d.Specialty ?? '').toLowerCase().includes(q),
    );
  }, [doctors, query]);

  async function handleAdd(data: FormState) {
    const payload: CreateDoctorPayload = {
      FirstName: data.FirstName,
      LastName: data.LastName,
      Specialty: data.Specialty || null as any,
      ContactNumber: data.ContactNumber || null as any,
    };
    const created = await createDoctor(payload);
    setDoctors((prev) => [...prev, created]);
    setModal(null);
  }

  async function handleEdit(doctor: Doctor, data: FormState) {
    const updated = await updateDoctor(doctor.DoctorID, {
      FirstName: data.FirstName,
      LastName: data.LastName,
      Specialty: data.Specialty || null as any,
      ContactNumber: data.ContactNumber || null as any,
    });
    setDoctors((prev) => prev.map((d) => (d.DoctorID === updated.DoctorID ? updated : d)));
    setModal(null);
  }

  async function handleDelete(doctor: Doctor) {
    setDeleteLoading(true);
    try {
      await deleteDoctor(doctor.DoctorID);
      setDoctors((prev) => prev.filter((d) => d.DoctorID !== doctor.DoctorID));
      setModal(null);
    } catch {
      setError('Failed to delete doctor.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Doctors</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} on file
          </p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className={primaryBtnCls}>
          <Plus className="h-4 w-4" />
          Add Doctor
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" placeholder="Search doctors…" value={query}
          onChange={(e) => setQuery(e.target.value)} className={`${inputCls} pl-9`} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">Loading…</span>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Stethoscope className="h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-500">
                {query ? 'No doctors match your search.' : 'No doctors yet — add one to get started.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Specialty</th>
                  <th className={thCls}>Contact</th>
                  <th className={thCls}>ID</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => (
                  <tr key={d.DoctorID} className="group transition-colors hover:bg-slate-50">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                          {d.FirstName[0]}{d.LastName[0]}
                        </div>
                        <span className="font-medium text-slate-900">Dr. {d.FirstName} {d.LastName}</span>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {d.Specialty || '—'}
                      </span>
                    </td>
                    <td className={tdCls}>
                      {d.ContactNumber ? (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="h-3.5 w-3.5" />{d.ContactNumber}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                        #{d.DoctorID}
                      </span>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <IconBtn label="Edit doctor" onClick={() => setModal({ type: 'edit', doctor: d })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn label="Delete doctor" danger onClick={() => setModal({ type: 'delete', doctor: d })}>
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

      {modal?.type === 'add' && (
        <Modal title="Add Doctor" onClose={() => setModal(null)}>
          <DoctorForm onSubmit={handleAdd} onCancel={() => setModal(null)} submitLabel="Add Doctor" />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Edit Doctor" onClose={() => setModal(null)}>
          <DoctorForm
            initial={{
              FirstName: modal.doctor.FirstName,
              LastName: modal.doctor.LastName,
              Specialty: modal.doctor.Specialty ?? '',
              ContactNumber: modal.doctor.ContactNumber ?? '',
            }}
            onSubmit={(data) => handleEdit(modal.doctor, data)}
            onCancel={() => setModal(null)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Delete Doctor" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-slate-900">
              Dr. {modal.doctor.FirstName} {modal.doctor.LastName}
            </span>? This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className={cancelBtnCls}>Cancel</button>
            <button onClick={() => handleDelete(modal.doctor)} disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60">
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function IconBtn({ label, danger = false, onClick, children }: {
  label: string; danger?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label}
      className={['rounded-lg p-1.5 transition-colors',
        danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
               : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'].join(' ')}>
      {children}
    </button>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';
const thCls = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500';
const tdCls = 'px-4 py-3 text-sm text-slate-600';
const primaryBtnCls = 'inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60';
const cancelBtnCls = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50';
