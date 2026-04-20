import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

export class Doctor extends Model {
  declare DoctorID: number;
  declare FirstName: string;
  declare LastName: string;
  declare Specialty: string | null;
  declare ContactNumber: string | null;
}

Doctor.init(
  {
    DoctorID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    FirstName: { type: DataTypes.STRING(50), allowNull: false },
    LastName:  { type: DataTypes.STRING(50), allowNull: false },
    Specialty: { type: DataTypes.STRING(100) },
    ContactNumber: { type: DataTypes.STRING(20) },
  },
  { sequelize, tableName: 'Doctors', timestamps: false },
);
