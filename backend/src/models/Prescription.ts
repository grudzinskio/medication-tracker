import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

export class Prescription extends Model {
  declare PrescriptionID: number;
  declare PatientID: number;
  declare MedID: number;
  declare DoctorID: number;
  declare PharmacyID: number;
  declare Dosage: string;
  declare Frequency: string | null;
  declare StartDate: string;
  declare EndDate: string | null;
}

Prescription.init(
  {
    PrescriptionID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    PatientID:  { type: DataTypes.INTEGER, allowNull: false },
    MedID:      { type: DataTypes.INTEGER, allowNull: false },
    DoctorID:   { type: DataTypes.INTEGER, allowNull: false },
    PharmacyID: { type: DataTypes.INTEGER, allowNull: false },
    Dosage:     { type: DataTypes.STRING(50), allowNull: false },
    Frequency:  { type: DataTypes.STRING(50) },
    StartDate:  { type: DataTypes.DATEONLY, allowNull: false },
    EndDate:    { type: DataTypes.DATEONLY },
  },
  { sequelize, tableName: 'Prescriptions', timestamps: false },
);
