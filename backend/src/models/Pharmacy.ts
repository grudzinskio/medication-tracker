import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

export class Pharmacy extends Model {
  declare PharmacyID: number;
  declare Name: string;
  declare Address: string | null;
  declare Phone: string | null;
}

Pharmacy.init(
  {
    PharmacyID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Name:    { type: DataTypes.STRING(100), allowNull: false },
    Address: { type: DataTypes.STRING(255) },
    Phone:   { type: DataTypes.STRING(20) },
  },
  { sequelize, tableName: 'Pharmacies', timestamps: false },
);
