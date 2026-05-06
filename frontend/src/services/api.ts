/**
 * API Service Layer
 *
 * All functions are async and simulate network latency with setTimeout.
 * When the real Node/Express backend is ready, replace the mock bodies with
 * `fetch(BASE_URL + endpoint, options)` calls — the call-sites don't change.
 *
 * Base URL is read from the Vite env variable VITE_API_URL (set in .env).
 * Default: http://localhost:3001/api
 */

import type {
  AdherenceSummary,
  ClinicalWarningsResponse,
  CreateDoctorPayload,
  CreateMedicationPayload,
  CreatePatientPayload,
  CreatePharmacyPayload,
  CreatePrescriptionPayload,
  DoctorDashboardResponse,
  Doctor,
  DoseLog,
  DrugLookupSuggestion,
  LogDosePayload,
  Medication,
  Patient,
  Pharmacy,
  Prescription,
  Refill,
  ScheduledMedication,
  UpdateDoctorPayload,
  UpdateMedicationPayload,
  UpdatePatientPayload,
  UpdatePharmacyPayload,
  UpdatePrescriptionPayload,
} from '../types';
import type { AuthUser } from '../auth/types';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/** Set to `true` to use the mock in-memory store instead of the real backend. */
const USE_MOCK = false;

/** Simulates a realistic network round-trip delay (ms). */
const delay = (ms = 300) => new Promise<void>((res) => setTimeout(res, ms));

// ─── Auth token handling ───────────────────────────────────────────────────────

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Same key as AuthContext — keep in sync. Call once before React render so first API calls include Bearer. */
const AUTH_STORAGE_KEY = 'medication-tracker-auth';

export function hydrateAuthTokenFromStorage(): void {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { token?: string };
    if (typeof parsed?.token === 'string' && parsed.token.length > 0) {
      authToken = parsed.token;
    }
  } catch {
    // ignore
  }
}

// ─── Mock data stores ─────────────────────────────────────────────────────────
// These are module-level arrays that act as an in-memory "database".
// Mutations (POST / PUT / DELETE) update them so the UI stays consistent
// across the session without a real backend.

let mockPatients: Patient[] = [
  { PatientID: 1, FirstName: 'Alice', LastName: 'Johnson', Email: 'alice@example.com', PrimaryDoctorID: 1 },
  { PatientID: 2, FirstName: 'Bob', LastName: 'Martinez', Email: 'bob@example.com', PrimaryDoctorID: 2 },
  { PatientID: 3, FirstName: 'Carol', LastName: 'Lee', Email: 'carol@example.com', PrimaryDoctorID: null },
];

let mockMedications: Medication[] = [
  {
    MedID: 1, DrugName: 'Lisinopril', GenericName: 'Lisinopril',
    Form: 'Tablet', Route: 'Oral', Manufacturer: 'GeneriCo', UnitType: 'mg',
  },
  {
    MedID: 2, DrugName: 'Metformin', GenericName: 'Metformin HCl',
    Form: 'Tablet', Route: 'Oral', Manufacturer: 'PharmaCorp', UnitType: 'mg',
  },
  {
    MedID: 3, DrugName: 'Atorvastatin', GenericName: 'Atorvastatin Calcium',
    Form: 'Tablet', Route: 'Oral', Manufacturer: 'StatinLab', UnitType: 'mg',
  },
  {
    MedID: 4, DrugName: 'Sertraline', GenericName: 'Sertraline HCl',
    Form: 'Tablet', Route: 'Oral', Manufacturer: 'MindMed', UnitType: 'mg',
  },
];

let mockDoctors: Doctor[] = [
  { DoctorID: 1, FirstName: 'Sarah', LastName: 'Patel', Specialty: 'Cardiology', ContactNumber: '555-0101' },
  { DoctorID: 2, FirstName: 'James', LastName: 'Chen', Specialty: 'Endocrinology', ContactNumber: '555-0102' },
];

let mockPharmacies: Pharmacy[] = [
  { PharmacyID: 1, Name: 'MedPlus Pharmacy', Address: '123 Main St', Phone: '555-0200' },
  { PharmacyID: 2, Name: 'CareRx', Address: '456 Oak Ave', Phone: '555-0201' },
];

let mockPrescriptions: Prescription[] = [
  {
    PrescriptionID: 1, PatientID: 1, MedID: 1, DoctorID: 1, PharmacyID: 1,
    Dosage: '10mg', Frequency: 'Once daily', StartDate: '2025-01-01', EndDate: null,
  },
  {
    PrescriptionID: 2, PatientID: 1, MedID: 2, DoctorID: 2, PharmacyID: 1,
    Dosage: '500mg', Frequency: 'Twice daily', StartDate: '2025-03-01', EndDate: null,
  },
  {
    PrescriptionID: 3, PatientID: 1, MedID: 3, DoctorID: 1, PharmacyID: 2,
    Dosage: '20mg', Frequency: 'Once daily', StartDate: '2025-06-01', EndDate: null,
  },
  {
    PrescriptionID: 4, PatientID: 2, MedID: 4, DoctorID: 2, PharmacyID: 2,
    Dosage: '50mg', Frequency: 'Once daily', StartDate: '2025-09-01', EndDate: null,
  },
];

let mockDoseLogs: DoseLog[] = [
  { LogID: 1, PrescriptionID: 1, TimeTaken: '2026-03-24T08:02:00Z', Status: 'Taken' },
  { LogID: 2, PrescriptionID: 2, TimeTaken: '2026-03-24T08:05:00Z', Status: 'Taken' },
  { LogID: 3, PrescriptionID: 3, TimeTaken: '2026-03-24T09:00:00Z', Status: 'Late' },
  { LogID: 4, PrescriptionID: 1, TimeTaken: '2026-03-23T08:00:00Z', Status: 'Taken' },
  { LogID: 5, PrescriptionID: 2, TimeTaken: '2026-03-23T08:10:00Z', Status: 'Missed' },
  { LogID: 6, PrescriptionID: 3, TimeTaken: '2026-03-23T07:55:00Z', Status: 'Taken' },
];

let mockRefills: Refill[] = [
  { RefillID: 1, PrescriptionID: 1, RefillDate: '2026-03-01', QuantityDispensed: 30 },
  { RefillID: 2, PrescriptionID: 2, RefillDate: '2026-03-01', QuantityDispensed: 60 },
];

let nextId = {
  patient: 4,
  medication: 5,
  doctor: 3,
  pharmacy: 3,
  prescription: 5,
  doseLog: 7,
  refill: 3,
};

// ─── Generic fetch wrapper (used when USE_MOCK is false) ──────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid username or password.');
    }
    if (res.status === 400) {
      let msg = '';
      try {
        const body = (await res.json()) as { error?: string };
        msg = body?.error ?? '';
      } catch {
        /* ignore */
      }
      if (/required/i.test(msg)) {
        throw new Error('Please enter your username and password.');
      }
      throw new Error('Invalid username or password.');
    }
    throw new Error('Unable to sign in. Please try again.');
  }

  return res.json() as Promise<{ token: string; user: AuthUser }>;
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export async function getPatients(): Promise<Patient[]> {
  if (USE_MOCK) { await delay(); return [...mockPatients]; }
  return apiFetch<Patient[]>('/patients');
}

export async function getPatient(id: number): Promise<Patient> {
  if (USE_MOCK) {
    await delay();
    const p = mockPatients.find((x) => x.PatientID === id);
    if (!p) throw new Error(`Patient ${id} not found`);
    return { ...p };
  }
  return apiFetch<Patient>(`/patients/${id}`);
}

export async function createPatient(payload: CreatePatientPayload): Promise<Patient> {
  if (USE_MOCK) {
    await delay();
    const created: Patient = { PatientID: nextId.patient++, PrimaryDoctorID: null, ...payload };
    mockPatients.push(created);
    return { ...created };
  }
  return apiFetch<Patient>('/patients', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updatePatient(id: number, payload: UpdatePatientPayload): Promise<Patient> {
  if (USE_MOCK) {
    await delay();
    mockPatients = mockPatients.map((p) =>
      p.PatientID === id ? { ...p, ...payload } : p
    );
    return getPatient(id);
  }
  return apiFetch<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function updatePatientPrimaryDoctor(
  id: number,
  primaryDoctorId: number | null,
): Promise<Patient> {
  if (USE_MOCK) {
    await delay();
    mockPatients = mockPatients.map((p) =>
      p.PatientID === id ? { ...p, PrimaryDoctorID: primaryDoctorId } : p
    );
    return getPatient(id);
  }
  return apiFetch<Patient>(`/patients/${id}/primary-doctor`, {
    method: 'PUT',
    body: JSON.stringify({ PrimaryDoctorID: primaryDoctorId }),
  });
}

export async function deletePatient(id: number): Promise<void> {
  if (USE_MOCK) { await delay(); mockPatients = mockPatients.filter((p) => p.PatientID !== id); return; }
  return apiFetch<void>(`/patients/${id}`, { method: 'DELETE' });
}

// ─── Medications ──────────────────────────────────────────────────────────────

export async function getMedications(): Promise<Medication[]> {
  if (USE_MOCK) { await delay(); return [...mockMedications]; }
  return apiFetch<Medication[]>('/medications');
}

export async function getMedication(id: number): Promise<Medication> {
  if (USE_MOCK) {
    await delay();
    const m = mockMedications.find((x) => x.MedID === id);
    if (!m) throw new Error(`Medication ${id} not found`);
    return { ...m };
  }
  return apiFetch<Medication>(`/medications/${id}`);
}

export async function createMedication(payload: CreateMedicationPayload): Promise<Medication> {
  if (USE_MOCK) {
    await delay();
    const created: Medication = { MedID: nextId.medication++, ...payload };
    mockMedications.push(created);
    return { ...created };
  }
  return apiFetch<Medication>('/medications', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateMedication(id: number, payload: UpdateMedicationPayload): Promise<Medication> {
  if (USE_MOCK) {
    await delay();
    mockMedications = mockMedications.map((m) =>
      m.MedID === id ? { ...m, ...payload } : m
    );
    return getMedication(id);
  }
  return apiFetch<Medication>(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteMedication(id: number): Promise<void> {
  if (USE_MOCK) { await delay(); mockMedications = mockMedications.filter((m) => m.MedID !== id); return; }
  return apiFetch<void>(`/medications/${id}`, { method: 'DELETE' });
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export async function getDoctors(): Promise<Doctor[]> {
  if (USE_MOCK) { await delay(); return [...mockDoctors]; }
  return apiFetch<Doctor[]>('/doctors');
}

export async function getDoctor(id: number): Promise<Doctor> {
  if (USE_MOCK) {
    await delay();
    const d = mockDoctors.find((x) => x.DoctorID === id);
    if (!d) throw new Error(`Doctor ${id} not found`);
    return { ...d };
  }
  return apiFetch<Doctor>(`/doctors/${id}`);
}

export async function createDoctor(payload: CreateDoctorPayload): Promise<Doctor> {
  if (USE_MOCK) {
    await delay();
    const created: Doctor = { DoctorID: nextId.doctor++, ...payload };
    mockDoctors.push(created);
    return { ...created };
  }
  return apiFetch<Doctor>('/doctors', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateDoctor(id: number, payload: UpdateDoctorPayload): Promise<Doctor> {
  if (USE_MOCK) {
    await delay();
    mockDoctors = mockDoctors.map((d) => d.DoctorID === id ? { ...d, ...payload } : d);
    return { ...mockDoctors.find((d) => d.DoctorID === id)! };
  }
  return apiFetch<Doctor>(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteDoctor(id: number): Promise<void> {
  if (USE_MOCK) { await delay(); mockDoctors = mockDoctors.filter((d) => d.DoctorID !== id); return; }
  return apiFetch<void>(`/doctors/${id}`, { method: 'DELETE' });
}

// ─── Pharmacies ───────────────────────────────────────────────────────────────

export async function getPharmacies(): Promise<Pharmacy[]> {
  if (USE_MOCK) { await delay(); return [...mockPharmacies]; }
  return apiFetch<Pharmacy[]>('/pharmacies');
}

export async function createPharmacy(payload: CreatePharmacyPayload): Promise<Pharmacy> {
  if (USE_MOCK) {
    await delay();
    const created: Pharmacy = { PharmacyID: nextId.pharmacy++, ...payload };
    mockPharmacies.push(created);
    return { ...created };
  }
  return apiFetch<Pharmacy>('/pharmacies', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updatePharmacy(id: number, payload: UpdatePharmacyPayload): Promise<Pharmacy> {
  if (USE_MOCK) {
    await delay();
    mockPharmacies = mockPharmacies.map((p) => p.PharmacyID === id ? { ...p, ...payload } : p);
    return { ...mockPharmacies.find((p) => p.PharmacyID === id)! };
  }
  return apiFetch<Pharmacy>(`/pharmacies/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deletePharmacy(id: number): Promise<void> {
  if (USE_MOCK) { await delay(); mockPharmacies = mockPharmacies.filter((p) => p.PharmacyID !== id); return; }
  return apiFetch<void>(`/pharmacies/${id}`, { method: 'DELETE' });
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export async function getPrescriptions(patientId?: number): Promise<Prescription[]> {
  if (USE_MOCK) {
    await delay();
    const result = patientId
      ? mockPrescriptions.filter((p) => p.PatientID === patientId)
      : [...mockPrescriptions];
    return result;
  }
  const qs = patientId ? `?patientId=${patientId}` : '';
  return apiFetch<Prescription[]>(`/prescriptions${qs}`);
}

export async function createPrescription(payload: CreatePrescriptionPayload): Promise<Prescription> {
  if (USE_MOCK) {
    await delay();
    const created: Prescription = { PrescriptionID: nextId.prescription++, ...payload };
    mockPrescriptions.push(created);
    return { ...created };
  }
  return apiFetch<Prescription>('/prescriptions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updatePrescription(id: number, payload: UpdatePrescriptionPayload): Promise<Prescription> {
  if (USE_MOCK) {
    await delay();
    mockPrescriptions = mockPrescriptions.map((p) =>
      p.PrescriptionID === id ? { ...p, ...payload } : p
    );
    const updated = mockPrescriptions.find((p) => p.PrescriptionID === id)!;
    return { ...updated };
  }
  return apiFetch<Prescription>(`/prescriptions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deletePrescription(id: number): Promise<void> {
  if (USE_MOCK) {
    await delay();
    mockPrescriptions = mockPrescriptions.filter((p) => p.PrescriptionID !== id);
    return;
  }
  return apiFetch<void>(`/prescriptions/${id}`, { method: 'DELETE' });
}

// ─── Dose Logs ────────────────────────────────────────────────────────────────

export async function getDoseLogs(prescriptionId?: number): Promise<DoseLog[]> {
  if (USE_MOCK) {
    await delay();
    return prescriptionId
      ? mockDoseLogs.filter((l) => l.PrescriptionID === prescriptionId)
      : [...mockDoseLogs];
  }
  const qs = prescriptionId ? `?prescriptionId=${prescriptionId}` : '';
  return apiFetch<DoseLog[]>(`/dose-logs${qs}`);
}

export async function logDose(payload: LogDosePayload): Promise<DoseLog> {
  if (USE_MOCK) {
    await delay();
    const created: DoseLog = {
      LogID: nextId.doseLog++,
      PrescriptionID: payload.PrescriptionID,
      TimeTaken: payload.TimeTaken ?? new Date().toISOString(),
      Status: payload.Status,
    };
    mockDoseLogs.push(created);
    return { ...created };
  }
  return apiFetch<DoseLog>('/dose-logs', { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Refills ──────────────────────────────────────────────────────────────────

export async function getRefills(prescriptionId?: number): Promise<Refill[]> {
  if (USE_MOCK) {
    await delay();
    return prescriptionId
      ? mockRefills.filter((r) => r.PrescriptionID === prescriptionId)
      : [...mockRefills];
  }
  const qs = prescriptionId ? `?prescriptionId=${prescriptionId}` : '';
  return apiFetch<Refill[]>(`/refills${qs}`);
}

export async function createRefill(payload: Omit<Refill, 'RefillID'>): Promise<Refill> {
  if (USE_MOCK) {
    await delay();
    const created: Refill = { RefillID: nextId.refill++, ...payload };
    mockRefills.push(created);
    return { ...created };
  }
  return apiFetch<Refill>('/refills', { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Composite / dashboard queries ────────────────────────────────────────────

export async function getDoctorDashboard(params?: {
  from?: string;
  to?: string;
  lowThresholdPct?: number;
  noRecentLogsDays?: number;
}): Promise<DoctorDashboardResponse> {
  if (USE_MOCK) {
    await delay(350);
    return {
      scope: { doctorId: 1, from: params?.from ?? '2026-01-01', to: params?.to ?? '2026-01-30' },
      aggregate: { TotalDoses: 0, Taken: 0, Missed: 0, Late: 0, AdherencePct: 0, Patients: 0, PatientsBelowPct: 0 },
      trend: [],
      alerts: [],
      patients: [],
    };
  }

  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (typeof params?.lowThresholdPct === 'number') qs.set('lowThresholdPct', String(params.lowThresholdPct));
  if (typeof params?.noRecentLogsDays === 'number') qs.set('noRecentLogsDays', String(params.noRecentLogsDays));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<DoctorDashboardResponse>(`/doctors/me/dashboard${suffix}`);
}

/**
 * Returns the daily medication schedule for a patient — prescriptions
 * joined with medication details and today's log status.
 * Maps to: GET /patients/:id/daily-schedule
 */
export async function getDailySchedule(patientId: number): Promise<ScheduledMedication[]> {
  if (USE_MOCK) {
    await delay(400);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const patientRx = mockPrescriptions.filter((p) => p.PatientID === patientId);

    return patientRx.map((rx) => {
      const med = mockMedications.find((m) => m.MedID === rx.MedID)!;
      const doc = mockDoctors.find((d) => d.DoctorID === rx.DoctorID)!;

      const todayLog =
        mockDoseLogs
          .filter(
            (l) => l.PrescriptionID === rx.PrescriptionID && l.TimeTaken.startsWith(today)
          )
          .at(-1) ?? null;

      return {
        PrescriptionID: rx.PrescriptionID,
        PatientID: rx.PatientID,
        DrugName: med.DrugName,
        GenericName: med.GenericName,
        Form: med.Form,
        Route: med.Route,
        Dosage: rx.Dosage,
        Frequency: rx.Frequency,
        DoctorFirstName: doc.FirstName,
        DoctorLastName: doc.LastName,
        TodayLog: todayLog,
      };
    });
  }
  return apiFetch<ScheduledMedication[]>(`/patients/${patientId}/daily-schedule`);
}

/**
 * Returns an adherence summary for a patient over a given date range.
 * Maps to: GET /patients/:id/adherence?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getAdherence(
  patientId: number,
  from: string,
  to: string
): Promise<AdherenceSummary> {
  if (USE_MOCK) {
    await delay(350);
    const patientRxIds = mockPrescriptions
      .filter((p) => p.PatientID === patientId)
      .map((p) => p.PrescriptionID);

    const logs = mockDoseLogs.filter(
      (l) =>
        patientRxIds.includes(l.PrescriptionID) &&
        l.TimeTaken >= from &&
        l.TimeTaken <= to + 'T23:59:59Z'
    );

    const taken = logs.filter((l) => l.Status === 'Taken').length;
    const missed = logs.filter((l) => l.Status === 'Missed').length;
    const late = logs.filter((l) => l.Status === 'Late').length;
    const total = logs.length;

    return {
      PatientID: patientId,
      TotalDoses: total,
      Taken: taken,
      Missed: missed,
      Late: late,
      AdherencePct: total > 0 ? Math.round((taken / total) * 100) : 0,
    };
  }
  return apiFetch<AdherenceSummary>(
    `/patients/${patientId}/adherence?from=${from}&to=${to}`
  );
}

export async function searchMedicationLookup(query: string): Promise<DrugLookupSuggestion[]> {
  if (USE_MOCK) {
    await delay();
    return [];
  }
  const qs = new URLSearchParams({ q: query });
  const data = await apiFetch<{ results: DrugLookupSuggestion[] }>(
    `/medication-lookup?${qs.toString()}`
  );
  return data.results;
}

export async function getClinicalWarnings(patientId: number): Promise<ClinicalWarningsResponse> {
  if (USE_MOCK) {
    await delay();
    return {
      disclaimer: '',
      duplicateTherapySameDrug: [],
      duplicateTherapySameGeneric: [],
      interactionHints: [],
    };
  }
  return apiFetch<ClinicalWarningsResponse>(`/patients/${patientId}/clinical-warnings`);
}

export async function emailPatientFromDoctor(payload: {
  patientId: number;
  subject: string;
  body: string;
  /** If set, sends here instead of the patient record email (demo / classroom use). */
  to?: string;
}): Promise<{ ok: boolean; to: string; delivery: 'smtp' | 'ethereal' | 'console'; previewUrl: string | null }> {
  if (USE_MOCK) {
    await delay();
    return {
      ok: true,
      to: payload.to?.trim() || 'mock@example.com',
      delivery: 'console',
      previewUrl: null,
    };
  }
  const body: Record<string, unknown> = {
    patientId: payload.patientId,
    subject: payload.subject,
    body: payload.body,
  };
  const override = payload.to?.trim();
  if (override) body.to = override;
  return apiFetch<{
    ok: boolean;
    to: string;
    delivery: 'smtp' | 'ethereal' | 'console';
    previewUrl: string | null;
  }>('/doctors/me/email-patient', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
