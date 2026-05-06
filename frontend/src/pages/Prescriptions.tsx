import {
  AlertCircle,
  CalendarRange,
  ClipboardList,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { useLocation } from 'react-router-dom';
import {
  createPrescription,
  createRefill,
  deletePrescription,
  getClinicalWarnings,
  getDoctor,
  getDoctors,
  getMedications,
  getPatients,
  getPharmacies,
  getPrescriptions,
  getRefills,
  updatePrescription,
} from '../services/api';
import type {
  ClinicalWarningsResponse,
  CreatePrescriptionPayload,
  Doctor,
  Medication,
  Patient,
  Pharmacy,
  Prescription,
  Refill,
} from '../types';
import { useAuth } from '../auth/AuthContext';

// ─── Prescription form ────────────────────────────────────────────────────────

interface PrescriptionFormState {
  PatientID: string;
  MedID: string;
  DoctorID: string;
  PharmacyID: string;
  Dosage: string;
  Frequency: string;
  StartDate: string;
  EndDate: string;
}

const emptyPrescriptionForm: PrescriptionFormState = {
  PatientID: '', MedID: '', DoctorID: '', PharmacyID: '',
  Dosage: '', Frequency: '', StartDate: '', EndDate: '',
};

interface PrescriptionFormProps {
  initial?: PrescriptionFormState;
  patients: Patient[];
  medications: Medication[];
  doctors: Doctor[];
  pharmacies: Pharmacy[];
  onSubmit: (data: PrescriptionFormState) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  lockedDoctorId?: number | null;
}

function PrescriptionForm({
  initial = emptyPrescriptionForm,
  patients, medications, doctors, pharmacies,
  onSubmit, onCancel, submitLabel,
  lockedDoctorId = null,
}: PrescriptionFormProps) {
  const [form, setForm] = useState<PrescriptionFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If doctor is locked (doctor role), enforce it in the form state
  useEffect(() => {
    if (!lockedDoctorId) return;
    setForm((prev) => ({ ...prev, DoctorID: String(lockedDoctorId) }));
  }, [lockedDoctorId]);

  function set(field: keyof PrescriptionFormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.PatientID || !form.MedID || !form.DoctorID || !form.PharmacyID || !form.Dosage || !form.StartDate) {
      setError('Please fill in all required fields.');
      return;
    }
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Patient" required>
          <select aria-label="Patient" required value={form.PatientID} onChange={set('PatientID')} className={inputCls}>
            <option value="" disabled>Select patient…</option>
            {patients.map((p) => (
              <option key={p.PatientID} value={p.PatientID}>
                {p.FirstName} {p.LastName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Medication" required>
          <select aria-label="Medication" required value={form.MedID} onChange={set('MedID')} className={inputCls}>
            <option value="" disabled>Select medication…</option>
            {medications.map((m) => (
              <option key={m.MedID} value={m.MedID}>{m.DrugName}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Doctor" required>
          <select
            aria-label="Doctor"
            required
            value={form.DoctorID}
            onChange={set('DoctorID')}
            disabled={Boolean(lockedDoctorId)}
            className={inputCls}
          >
            <option value="" disabled>Select doctor…</option>
            {doctors.map((d) => (
              <option key={d.DoctorID} value={d.DoctorID}>
                Dr. {d.FirstName} {d.LastName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pharmacy" required>
          <select aria-label="Pharmacy" required value={form.PharmacyID} onChange={set('PharmacyID')} className={inputCls}>
            <option value="" disabled>Select pharmacy…</option>
            {pharmacies.map((p) => (
              <option key={p.PharmacyID} value={p.PharmacyID}>{p.Name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Dosage" required>
          <input type="text" required value={form.Dosage} onChange={set('Dosage')}
            placeholder="10mg" className={inputCls} />
        </Field>
        <Field label="Frequency" required>
          <input type="text" required value={form.Frequency} onChange={set('Frequency')}
            placeholder="Once daily" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date" required>
            <input aria-label="Start date" type="date" required value={form.StartDate} onChange={set('StartDate')} className={inputCls} />
        </Field>
        <Field label="End Date">
          <input aria-label="End date" type="date" value={form.EndDate} onChange={set('EndDate')} className={inputCls} />
        </Field>
      </div>

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

// ─── Refills modal ────────────────────────────────────────────────────────────

interface RefillsModalProps {
  prescription: Prescription;
  patients: Patient[];
  medications: Medication[];
  onClose: () => void;
}

function RefillsModal({ prescription, patients, medications, onClose }: RefillsModalProps) {
  const [refills, setRefills] = useState<Refill[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState('');
  const [addQty, setAddQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRefills(prescription.PrescriptionID)
      .then(setRefills)
      .catch(() => setError('Failed to load refills.'))
      .finally(() => setLoading(false));
  }, [prescription.PrescriptionID]);

  async function handleAddRefill(e: React.FormEvent) {
    e.preventDefault();
    if (!addDate || !addQty) { setError('Date and quantity are required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const refill = await createRefill({
        PrescriptionID: prescription.PrescriptionID,
        RefillDate: addDate,
        QuantityDispensed: parseInt(addQty, 10),
      });
      setRefills((prev) => [refill, ...prev]);
      setAddDate('');
      setAddQty('');
    } catch {
      setError('Failed to add refill.');
    } finally {
      setSaving(false);
    }
  }

  const patient = patients.find((p) => p.PatientID === prescription.PatientID);
  const med = medications.find((m) => m.MedID === prescription.MedID);

  return (
    <Modal title="Refill History" onClose={onClose} size="max-w-xl">
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{med?.DrugName ?? `Rx #${prescription.PrescriptionID}`}</span>
          {' '} — {patient?.FirstName} {patient?.LastName} · {prescription.Dosage}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Add refill form */}
        <form onSubmit={handleAddRefill} className="flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Refill Date</label>
            <input aria-label="Refill date" type="date" required value={addDate} onChange={(e) => setAddDate(e.target.value)}
              className={inputCls} />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-slate-700">Qty Dispensed</label>
            <input aria-label="Quantity dispensed" type="number" required min="1" value={addQty} onChange={(e) => setAddQty(e.target.value)}
              placeholder="30" className={inputCls} />
          </div>
          <button type="submit" disabled={saving} className={`${primaryBtnCls} shrink-0`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>

        {/* Refill list */}
        {loading ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : refills.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
            <RefreshCcw className="h-8 w-8" />
            <p className="text-sm">No refills recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {refills.map((r) => (
              <div key={r.RefillID} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarRange className="h-4 w-4 text-teal-500" />
                  {r.RefillDate}
                </div>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                  {r.QuantityDispensed} units
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Prescriptions page ───────────────────────────────────────────────────────

type ModalMode =
  | { type: 'add' }
  | { type: 'edit'; prescription: Prescription }
  | { type: 'delete'; prescription: Prescription }
  | { type: 'refills'; prescription: Prescription };

export default function Prescriptions() {
  const { user } = useAuth();
  const location = useLocation();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [clinical, setClinical] = useState<ClinicalWarningsResponse | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const isDoctor = Boolean(user?.roles.includes('doctor'));
        const doctorId = user?.doctorId ?? null;

        const qs = new URLSearchParams(location.search);
        const patientIdParam = qs.get('patientId');
        const patientId = patientIdParam ? Number(patientIdParam) : undefined;

        const [rxs, pts, meds, pharms] = await Promise.all([
          getPrescriptions(patientId),
          getPatients(),
          getMedications(),
          getPharmacies(),
        ]);

        setPrescriptions(rxs);
        setPatients(pts);
        setMedications(meds);
        setPharmacies(pharms);

        if (isDoctor && doctorId) {
          const doc = await getDoctor(doctorId);
          setDoctors([doc]);
        } else {
          const docs = await getDoctors();
          setDoctors(docs);
        }
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.doctorId, user?.roles, location.search]);

  const patientMap  = useMemo(() => new Map(patients.map((p) => [p.PatientID, p])),    [patients]);
  const medMap      = useMemo(() => new Map(medications.map((m) => [m.MedID, m])),      [medications]);
  const doctorMap   = useMemo(() => new Map(doctors.map((d) => [d.DoctorID, d])),       [doctors]);
  const pharmacyMap = useMemo(() => new Map(pharmacies.map((p) => [p.PharmacyID, p])), [pharmacies]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter((rx) => {
      const pt  = patientMap.get(rx.PatientID);
      const med = medMap.get(rx.MedID);
      return (
        med?.DrugName.toLowerCase().includes(q) ||
        pt?.FirstName.toLowerCase().includes(q) ||
        pt?.LastName.toLowerCase().includes(q) ||
        rx.Dosage.toLowerCase().includes(q)
      );
    });
  }, [prescriptions, query, patientMap, medMap]);

  const focusPatientId = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    const fromUrl = qs.get('patientId');
    if (fromUrl) {
      const n = Number(fromUrl);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const ids = new Set(filtered.map((r) => r.PatientID));
    if (ids.size === 1) return [...ids][0]!;
    return null;
  }, [location.search, filtered]);

  useEffect(() => {
    if (!focusPatientId) {
      setClinical(null);
      return;
    }
    const roles = user?.roles ?? [];
    const ok =
      roles.includes('admin') ||
      roles.includes('doctor') ||
      (roles.includes('patient') && user?.patientId === focusPatientId);
    if (!ok) {
      setClinical(null);
      return;
    }
    getClinicalWarnings(focusPatientId)
      .then(setClinical)
      .catch(() => setClinical(null));
  }, [focusPatientId, user?.roles, user?.patientId]);

  function buildPayload(data: PrescriptionFormState): CreatePrescriptionPayload {
    return {
      PatientID:  parseInt(data.PatientID, 10),
      MedID:      parseInt(data.MedID, 10),
      DoctorID:   parseInt(data.DoctorID, 10),
      PharmacyID: parseInt(data.PharmacyID, 10),
      Dosage:     data.Dosage,
      Frequency:  data.Frequency,
      StartDate:  data.StartDate,
      EndDate:    data.EndDate || null,
    };
  }

  async function handleAdd(data: PrescriptionFormState) {
    const created = await createPrescription(buildPayload(data));
    setPrescriptions((prev) => [...prev, created]);
    setModal(null);
  }

  async function handleEdit(rx: Prescription, data: PrescriptionFormState) {
    const updated = await updatePrescription(rx.PrescriptionID, buildPayload(data));
    setPrescriptions((prev) => prev.map((p) => (p.PrescriptionID === updated.PrescriptionID ? updated : p)));
    setModal(null);
  }

  async function handleDelete(rx: Prescription) {
    setDeleteLoading(true);
    try {
      await deletePrescription(rx.PrescriptionID);
      setPrescriptions((prev) => prev.filter((p) => p.PrescriptionID !== rx.PrescriptionID));
      setModal(null);
    } catch {
      setError('Failed to delete prescription.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prescriptions</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className={primaryBtnCls}>
          <Plus className="h-4 w-4" />
          Add Prescription
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" placeholder="Search by patient or medication…" value={query}
          onChange={(e) => setQuery(e.target.value)} className={`${inputCls} pl-9`} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {clinical &&
        (clinical.duplicateTherapySameDrug.length > 0 ||
          clinical.duplicateTherapySameGeneric.length > 0 ||
          clinical.interactionHints.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold text-amber-900">Clinical awareness (educational demo)</p>
          <p className="mt-1 text-xs text-amber-900/80">{clinical.disclaimer}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
            {clinical.duplicateTherapySameDrug.map((d) => (
              <li key={`dup-${d.MedID}`}>
                Duplicate active prescriptions for <strong>{d.DrugName}</strong> ({d.count} rows).
              </li>
            ))}
            {clinical.duplicateTherapySameGeneric.map((g) => (
              <li key={g.GenericName}>
                Same generic ({g.GenericName}) on multiple drugs: {g.DrugNames.join(', ')}.
              </li>
            ))}
            {clinical.interactionHints.map((h) => (
              <li key={`${h.MedID_1}-${h.MedID_2}`}>
                {h.DrugName_1} + {h.DrugName_2}: {h.Note}
              </li>
            ))}
          </ul>
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
              <ClipboardList className="h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-500">
                {query ? 'No prescriptions match your search.' : 'No prescriptions yet — add one to get started.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={thCls}>Patient</th>
                  <th className={thCls}>Medication</th>
                  <th className={thCls}>Dosage · Freq</th>
                  <th className={thCls}>Doctor</th>
                  <th className={thCls}>Dates</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((rx) => {
                  const pt   = patientMap.get(rx.PatientID);
                  const med  = medMap.get(rx.MedID);
                  const doc  = doctorMap.get(rx.DoctorID);
                  const pharm = pharmacyMap.get(rx.PharmacyID);
                  return (
                    <tr key={rx.PrescriptionID} className="group transition-colors hover:bg-slate-50">
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">
                            {pt?.FirstName?.[0]}{pt?.LastName?.[0]}
                          </div>
                          <span className="font-medium text-slate-900">
                            {pt ? `${pt.FirstName} ${pt.LastName}` : `#${rx.PatientID}`}
                          </span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span className="font-medium text-slate-900">{med?.DrugName ?? `#${rx.MedID}`}</span>
                        {med && med.GenericName !== med.DrugName && (
                          <p className="text-xs text-slate-400">{med.GenericName}</p>
                        )}
                      </td>
                      <td className={tdCls}>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {rx.Dosage}
                        </span>
                        <span className="ml-1 text-slate-400">·</span>
                        <span className="ml-1 text-xs text-slate-500">{rx.Frequency}</span>
                      </td>
                      <td className={tdCls}>
                        <span className="text-slate-500">
                          {doc ? `Dr. ${doc.LastName}` : `#${rx.DoctorID}`}
                        </span>
                        {pharm && <p className="text-xs text-slate-400">{pharm.Name}</p>}
                      </td>
                      <td className={tdCls}>
                        <span className="text-xs text-slate-500">
                          {rx.StartDate}
                          {rx.EndDate ? ` → ${rx.EndDate}` : ' → ongoing'}
                        </span>
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setModal({ type: 'refills', prescription: rx })}
                            aria-label="View refills"
                            title="Refills"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </button>
                          <IconBtn label="Edit prescription" onClick={() => setModal({ type: 'edit', prescription: rx })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn label="Delete prescription" danger onClick={() => setModal({ type: 'delete', prescription: rx })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add modal */}
      {modal?.type === 'add' && (
        <Modal title="Add Prescription" onClose={() => setModal(null)} size="max-w-2xl">
          <PrescriptionForm
            patients={patients} medications={medications} doctors={doctors} pharmacies={pharmacies}
            onSubmit={handleAdd} onCancel={() => setModal(null)} submitLabel="Add Prescription"
            lockedDoctorId={user?.roles.includes('doctor') ? user.doctorId : null}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {modal?.type === 'edit' && (
        <Modal title="Edit Prescription" onClose={() => setModal(null)} size="max-w-2xl">
          <PrescriptionForm
            initial={{
              PatientID:  String(modal.prescription.PatientID),
              MedID:      String(modal.prescription.MedID),
              DoctorID:   String(modal.prescription.DoctorID),
              PharmacyID: String(modal.prescription.PharmacyID),
              Dosage:     modal.prescription.Dosage,
              Frequency:  modal.prescription.Frequency ?? '',
              StartDate:  modal.prescription.StartDate,
              EndDate:    modal.prescription.EndDate ?? '',
            }}
            patients={patients} medications={medications} doctors={doctors} pharmacies={pharmacies}
            onSubmit={(data) => handleEdit(modal.prescription, data)}
            onCancel={() => setModal(null)}
            submitLabel="Save Changes"
            lockedDoctorId={user?.roles.includes('doctor') ? user.doctorId : null}
          />
        </Modal>
      )}

      {/* Delete modal */}
      {modal?.type === 'delete' && (
        <Modal title="Delete Prescription" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete the prescription for{' '}
            <span className="font-semibold text-slate-900">
              {medMap.get(modal.prescription.MedID)?.DrugName ?? `Rx #${modal.prescription.PrescriptionID}`}
            </span>
            ? All dose logs for this prescription will also be removed.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className={cancelBtnCls}>Cancel</button>
            <button onClick={() => handleDelete(modal.prescription)} disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60">
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {/* Refills modal */}
      {modal?.type === 'refills' && (
        <RefillsModal
          prescription={modal.prescription}
          patients={patients}
          medications={medications}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
