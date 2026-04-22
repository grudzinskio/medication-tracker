import dotenv from 'dotenv';
import path from 'path';
// Load env before any other imports that touch process.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import cors from 'cors';
import express from 'express';
import sequelize from './db/sequelize';
import './models/index'; // initialises models + associations
import authRouter from './routes/auth';
import doctorsRouter from './routes/doctors';
import doseLogsRouter from './routes/doseLogs';
import medicationsRouter from './routes/medications';
import patientsRouter from './routes/patients';
import pharmaciesRouter from './routes/pharmacies';
import prescriptionsRouter from './routes/prescriptions';
import refillsRouter from './routes/refills';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/patients',      patientsRouter);
app.use('/api/medications',   medicationsRouter);
app.use('/api/doctors',       doctorsRouter);
app.use('/api/pharmacies',    pharmaciesRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/dose-logs',     doseLogsRouter);
app.use('/api/refills',       refillsRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ MySQL connection established');
    app.listen(PORT, () => console.log(`✓ API listening on http://localhost:${PORT}/api`));
  } catch (err) {
    console.error('✗ Unable to connect to MySQL:', err);
    process.exit(1);
  }
})();
