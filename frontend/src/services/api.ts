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
  CreateMedicationPayload,
  CreatePatientPayload,
  CreatePrescriptionPayload,
  Doctor,
  DoseLog,
  LogDosePayload,
  Medication,
  Patient,
  Pharmacy,
  Prescription,
  Refill,
  ScheduledMedication,
  UpdateMedicationPayload,
  UpdatePatientPayload,
  UpdatePrescriptionPayload,
} from '../types';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/** Set to `true` to use the real backend instead of mocks. */
const USE_MOCK = true;

/** Simulates a realistic network round-trip delay (ms). */
const delay = (ms = 300) => new Promise<void>((res) => setTimeout(res, ms));

// ─── Mock data stores ─────────────────────────────────────────────────────────
// These are module-level arrays that act as an in-memory "database".
// Mutations (POST / PUT / DELETE) update them so the UI stays consistent
// across the session without a real backend.

let mockPatients: Patient[] = [
  { PatientID: 1, FirstName: 'Alice', LastName: 'Johnson', Email: 'alice@example.com' },
  { PatientID: 2, FirstName: 'Bob', LastName: 'Martinez', Email: 'bob@example.com' },
  { PatientID: 3, FirstName: 'Carol', LastName: 'Lee', Email: 'carol@example.com' },
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

const mockDoctors: Doctor[] = [
  { DoctorID: 1, FirstName: 'Sarah', LastName: 'Patel', Specialty: 'Cardiology', ContactNumber: '555-0101' },
  { DoctorID: 2, FirstName: 'James', LastName: 'Chen', Specialty: 'Endocrinology', ContactNumber: '555-0102' },
];

const mockPharmacies: Pharmacy[] = [
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
  prescription: 5,
  doseLog: 7,
  refill: 3,
};

// ─── Generic fetch wrapper (used when USE_MOCK is false) ──────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
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
    const created: Patient = { PatientID: nextId.patient++, ...payload };
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

// ─── Pharmacies ───────────────────────────────────────────────────────────────

export async function getPharmacies(): Promise<Pharmacy[]> {
  if (USE_MOCK) { await delay(); return [...mockPharmacies]; }
  return apiFetch<Pharmacy[]>('/pharmacies');
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
