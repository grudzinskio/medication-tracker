import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

export class Medication extends Model {
  declare MedID: number;
  declare DrugName: string;
  declare GenericName: string | null;
  declare Form: string | null;
  declare Route: string | null;
  declare Manufacturer: string | null;
  declare UnitType: string | null;
}

Medication.init(
  {
    MedID:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    DrugName:     { type: DataTypes.STRING(100), allowNull: false },
    GenericName:  { type: DataTypes.STRING(255) },
    Form:         { type: DataTypes.STRING(100) },
    Route:        { type: DataTypes.STRING(100) },
    Manufacturer: { type: DataTypes.STRING(255) },
    UnitType:     { type: DataTypes.STRING(500) },
  },
  { sequelize, tableName: 'Medications', timestamps: false },
);
