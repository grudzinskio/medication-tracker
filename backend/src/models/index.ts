import { Doctor } from './Doctor';
import { DoseLog } from './DoseLog';
import { Medication } from './Medication';
import { Patient } from './Patient';
import { Pharmacy } from './Pharmacy';
import { Prescription } from './Prescription';
import { Refill } from './Refill';

// Patient <-> Prescription
Patient.hasMany(Prescription, { foreignKey: 'PatientID', as: 'Prescriptions' });
Prescription.belongsTo(Patient, { foreignKey: 'PatientID', as: 'Patient' });

// Medication <-> Prescription
Medication.hasMany(Prescription, { foreignKey: 'MedID', as: 'Prescriptions' });
Prescription.belongsTo(Medication, { foreignKey: 'MedID', as: 'Medication' });

// Doctor <-> Prescription
Doctor.hasMany(Prescription, { foreignKey: 'DoctorID', as: 'Prescriptions' });
Prescription.belongsTo(Doctor, { foreignKey: 'DoctorID', as: 'Doctor' });

// Pharmacy <-> Prescription
Pharmacy.hasMany(Prescription, { foreignKey: 'PharmacyID', as: 'Prescriptions' });
Prescription.belongsTo(Pharmacy, { foreignKey: 'PharmacyID', as: 'Pharmacy' });

// Prescription <-> DoseLog
Prescription.hasMany(DoseLog, { foreignKey: 'PrescriptionID', as: 'DoseLogs' });
DoseLog.belongsTo(Prescription, { foreignKey: 'PrescriptionID', as: 'Prescription' });

// Prescription <-> Refill
Prescription.hasMany(Refill, { foreignKey: 'PrescriptionID', as: 'Refills' });
Refill.belongsTo(Prescription, { foreignKey: 'PrescriptionID', as: 'Prescription' });

export { Doctor, DoseLog, Medication, Patient, Pharmacy, Prescription, Refill };
