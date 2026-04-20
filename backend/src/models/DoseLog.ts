import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

export class DoseLog extends Model {
  declare LogID: number;
  declare PrescriptionID: number;
  declare TimeTaken: Date;
  declare Status: 'Taken' | 'Missed' | 'Late';
}

DoseLog.init(
  {
    LogID:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    PrescriptionID: { type: DataTypes.INTEGER, allowNull: false },
    TimeTaken:      { type: DataTypes.DATE, allowNull: false },
    Status:         {
      type: DataTypes.ENUM('Taken', 'Missed', 'Late'),
      defaultValue: 'Taken',
    },
  },
  { sequelize, tableName: 'Dose_Logs', timestamps: false },
);
