// ─── Core entity interfaces matching the MySQL schema ────────────────────────

export interface Patient {
  PatientID: number;
  FirstName: string;
  LastName: string;
  Email: string;
}

export interface Medication {
  MedID: number;
  DrugName: string;
  GenericName: string;
  Form: string;        // e.g. "Tablet", "Capsule", "Liquid"
  Route: string;       // e.g. "Oral", "Topical", "IV"
  Manufacturer: string;
  UnitType: string;    // e.g. "mg", "mL", "unit"
}

export interface Doctor {
  DoctorID: number;
  FirstName: string;
  LastName: string;
  Specialty: string;
  ContactNumber: string;
}

export interface Pharmacy {
  PharmacyID: number;
  Name: string;
  Address: string;
  Phone: string;
}

export interface Prescription {
  PrescriptionID: number;
  PatientID: number;
  MedID: number;
  DoctorID: number;
  PharmacyID: number;
  Dosage: string;       // e.g. "500mg"
  Frequency: string;    // e.g. "Once daily", "Twice daily"
  StartDate: string;    // ISO date string
  EndDate: string | null;
}

export type DoseStatus = 'Taken' | 'Missed' | 'Late';

export interface DoseLog {
  LogID: number;
  PrescriptionID: number;
  TimeTaken: string;    // ISO datetime string
  Status: DoseStatus;
}

export interface Refill {
  RefillID: number;
  PrescriptionID: number;
  RefillDate: string;   // ISO date string
  QuantityDispensed: number;
}

// ─── Composite / enriched types used by the frontend ─────────────────────────

/** A prescription joined with its medication details — used on the Dashboard. */
export interface ScheduledMedication {
  PrescriptionID: number;
  PatientID: number;
  DrugName: string;
  GenericName: string;
  Form: string;
  Route: string;
  Dosage: string;
  Frequency: string;
  DoctorFirstName: string;
  DoctorLastName: string;
  /** The most recent log entry for today, if any. */
  TodayLog: DoseLog | null;
}

/** Adherence summary for a patient over a given period. */
export interface AdherenceSummary {
  PatientID: number;
  TotalDoses: number;
  Taken: number;
  Missed: number;
  Late: number;
  AdherencePct: number; // 0–100
}

// ─── API payload types ────────────────────────────────────────────────────────

export type CreatePatientPayload = Omit<Patient, 'PatientID'>;
export type UpdatePatientPayload = Partial<CreatePatientPayload>;

export type CreateMedicationPayload = Omit<Medication, 'MedID'>;
export type UpdateMedicationPayload = Partial<CreateMedicationPayload>;

export type CreateDoctorPayload = Omit<Doctor, 'DoctorID'>;
export type UpdateDoctorPayload = Partial<CreateDoctorPayload>;

export type CreatePharmacyPayload = Omit<Pharmacy, 'PharmacyID'>;
export type UpdatePharmacyPayload = Partial<CreatePharmacyPayload>;

export type CreatePrescriptionPayload = Omit<Prescription, 'PrescriptionID'>;
export type UpdatePrescriptionPayload = Partial<CreatePrescriptionPayload>;

export interface LogDosePayload {
  PrescriptionID: number;
  Status: DoseStatus;
  /** Defaults to now on the server if omitted. */
  TimeTaken?: string;
}
