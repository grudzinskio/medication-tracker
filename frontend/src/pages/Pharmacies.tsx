import {
  AlertCircle,
  Building2,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { createPharmacy, deletePharmacy, getPharmacies, updatePharmacy } from '../services/api';
import type { CreatePharmacyPayload, Pharmacy } from '../types';

interface FormState {
  Name: string;
  Address: string;
  Phone: string;
}

const emptyForm: FormState = { Name: '', Address: '', Phone: '' };

interface PharmacyFormProps {
  initial?: FormState;
  onSubmit: (data: FormState) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function PharmacyForm({ initial = emptyForm, onSubmit, onCancel, submitLabel }: PharmacyFormProps) {
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
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}
      <Field label="Pharmacy Name" required>
        <input type="text" required value={form.Name} onChange={set('Name')}
          placeholder="MedPlus Pharmacy" className={inputCls} />
      </Field>
      <Field label="Address">
        <input type="text" value={form.Address} onChange={set('Address')}
          placeholder="123 Main St" className={inputCls} />
      </Field>
      <Field label="Phone">
        <input type="text" value={form.Phone} onChange={set('Phone')}
          placeholder="555-0200" className={inputCls} />
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

type ModalMode =
  | { type: 'add' }
  | { type: 'edit'; pharmacy: Pharmacy }
  | { type: 'delete'; pharmacy: Pharmacy };

export default function Pharmacies() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getPharmacies()
      .then(setPharmacies)
      .catch(() => setError('Failed to load pharmacies.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return pharmacies.filter(
      (p) =>
        p.Name.toLowerCase().includes(q) ||
        (p.Address ?? '').toLowerCase().includes(q),
    );
  }, [pharmacies, query]);

  async function handleAdd(data: FormState) {
    const payload: CreatePharmacyPayload = {
      Name: data.Name,
      Address: data.Address || null as any,
      Phone: data.Phone || null as any,
    };
    const created = await createPharmacy(payload);
    setPharmacies((prev) => [...prev, created]);
    setModal(null);
  }

  async function handleEdit(pharmacy: Pharmacy, data: FormState) {
    const updated = await updatePharmacy(pharmacy.PharmacyID, {
      Name: data.Name,
      Address: data.Address || null as any,
      Phone: data.Phone || null as any,
    });
    setPharmacies((prev) => prev.map((p) => (p.PharmacyID === updated.PharmacyID ? updated : p)));
    setModal(null);
  }

  async function handleDelete(pharmacy: Pharmacy) {
    setDeleteLoading(true);
    try {
      await deletePharmacy(pharmacy.PharmacyID);
      setPharmacies((prev) => prev.filter((p) => p.PharmacyID !== pharmacy.PharmacyID));
      setModal(null);
    } catch {
      setError('Failed to delete pharmacy.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pharmacies</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {pharmacies.length} pharmac{pharmacies.length !== 1 ? 'ies' : 'y'} on file
          </p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className={primaryBtnCls}>
          <Plus className="h-4 w-4" />
          Add Pharmacy
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" placeholder="Search pharmacies…" value={query}
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
              <Building2 className="h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-500">
                {query ? 'No pharmacies match your search.' : 'No pharmacies yet — add one to get started.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Address</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>ID</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.PharmacyID} className="group transition-colors hover:bg-slate-50">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                          <Building2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="font-medium text-slate-900">{p.Name}</span>
                      </div>
                    </td>
                    <td className={tdCls}>
                      {p.Address ? (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{p.Address}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={tdCls}>
                      {p.Phone ? (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="h-3.5 w-3.5" />{p.Phone}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                        #{p.PharmacyID}
                      </span>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <IconBtn label="Edit pharmacy" onClick={() => setModal({ type: 'edit', pharmacy: p })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn label="Delete pharmacy" danger onClick={() => setModal({ type: 'delete', pharmacy: p })}>
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
        <Modal title="Add Pharmacy" onClose={() => setModal(null)}>
          <PharmacyForm onSubmit={handleAdd} onCancel={() => setModal(null)} submitLabel="Add Pharmacy" />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Edit Pharmacy" onClose={() => setModal(null)}>
          <PharmacyForm
            initial={{
              Name: modal.pharmacy.Name,
              Address: modal.pharmacy.Address ?? '',
              Phone: modal.pharmacy.Phone ?? '',
            }}
            onSubmit={(data) => handleEdit(modal.pharmacy, data)}
            onCancel={() => setModal(null)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Delete Pharmacy" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-slate-900">{modal.pharmacy.Name}</span>?
            This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className={cancelBtnCls}>Cancel</button>
            <button onClick={() => handleDelete(modal.pharmacy)} disabled={deleteLoading}
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
