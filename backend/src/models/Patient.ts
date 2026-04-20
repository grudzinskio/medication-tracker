import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

export class Patient extends Model {
  declare PatientID: number;
  declare FirstName: string;
  declare LastName: string;
  declare Email: string;
}

Patient.init(
  {
    PatientID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    FirstName: { type: DataTypes.STRING(50), allowNull: false },
    LastName:  { type: DataTypes.STRING(50), allowNull: false },
    Email:     { type: DataTypes.STRING(100), allowNull: false, unique: true },
  },
  { sequelize, tableName: 'Patients', timestamps: false },
);
