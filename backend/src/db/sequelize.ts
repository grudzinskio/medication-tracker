import dotenv from 'dotenv';
import path from 'path';
import { Sequelize } from 'sequelize';

// Load root .env (three levels up from backend/src/db/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE!,
  process.env.MYSQL_USER!,
  process.env.MYSQL_PASSWORD!,
  {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
    dialect: 'mysql',
    timezone: '+00:00',
    logging: false,
  },
);

export default sequelize;
