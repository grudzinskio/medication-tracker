import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

export class Refill extends Model {
  declare RefillID: number;
  declare PrescriptionID: number;
  declare RefillDate: string;
  declare QuantityDispensed: number;
}

Refill.init(
  {
    RefillID:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    PrescriptionID:    { type: DataTypes.INTEGER, allowNull: false },
    RefillDate:        { type: DataTypes.DATEONLY, allowNull: false },
    QuantityDispensed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
  },
  { sequelize, tableName: 'Refills', timestamps: false },
);
