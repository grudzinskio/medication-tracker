import { Router, Request, Response } from 'express';
import { Op, fn, col } from 'sequelize';
import { Doctor, Prescription, DoseLog, Patient } from '../models';
import { authenticateJWT, requireRole } from '../auth/middleware';

const router = Router();

function utcDateString(daysAgo = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

type DoctorDashboardPatientRow = {
  PatientID: number;
  FirstName: string;
  LastName: string;
  ActiveRxCount: number;
  TotalDoses: number;
  Taken: number;
  Missed: number;
  Late: number;
  AdherencePct: number;
  MissedTodayCount: number;
  LastLogAt: string | null;
};

type DoctorDashboardResponse = {
  scope: { doctorId: number | null; from: string; to: string };
  aggregate: {
    TotalDoses: number;
    Taken: number;
    Missed: number;
    Late: number;
    AdherencePct: number;
    Patients: number;
    PatientsBelowPct: number;
  };
  trend: Array<{ Date: string; Taken: number; Missed: number; Late: number; TotalDoses: number; AdherencePct: number }>;
  alerts: Array<{ type: 'low_adherence' | 'missed_today' | 'no_recent_logs'; PatientID: number; message: string }>;
  patients: DoctorDashboardPatientRow[];
};

router.get(
  '/me/dashboard',
  authenticateJWT,
  requireRole('doctor', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Default range: last 30 days (inclusive)
      const to = (req.query.to as string) ?? utcDateString(0);
      const from = (req.query.from as string) ?? utcDateString(29);

      const doctorId = user.roles.includes('doctor') ? user.doctorId : null;
      if (user.roles.includes('doctor') && !doctorId) {
        const empty: DoctorDashboardResponse = {
          scope: { doctorId: null, from, to },
          aggregate: { TotalDoses: 0, Taken: 0, Missed: 0, Late: 0, AdherencePct: 0, Patients: 0, PatientsBelowPct: 0 },
          trend: [],
          alerts: [],
          patients: [],
        };
        return res.json(empty);
      }

      // Patient roster (scoped to doctor if doctor role)
      const rosterSql = `
        SELECT p.PatientID, p.FirstName, p.LastName,
               COUNT(DISTINCT pr.PrescriptionID) AS ActiveRxCount
        FROM Patients p
        JOIN Prescriptions pr ON pr.PatientID = p.PatientID
        WHERE (:doctorId IS NULL OR pr.DoctorID = :doctorId)
        GROUP BY p.PatientID, p.FirstName, p.LastName
        ORDER BY p.LastName ASC, p.FirstName ASC
      `;

      const [rosterRows] = await (Doctor.sequelize ?? Prescription.sequelize)!.query(rosterSql, {
        replacements: { doctorId },
      });

      const roster = (rosterRows as any[]).map((r) => ({
        PatientID: Number(r.PatientID),
        FirstName: String(r.FirstName),
        LastName: String(r.LastName),
        ActiveRxCount: Number(r.ActiveRxCount ?? 0),
      }));

      if (roster.length === 0) {
        const empty: DoctorDashboardResponse = {
          scope: { doctorId, from, to },
          aggregate: { TotalDoses: 0, Taken: 0, Missed: 0, Late: 0, AdherencePct: 0, Patients: 0, PatientsBelowPct: 0 },
          trend: [],
          alerts: [],
          patients: [],
        };
        return res.json(empty);
      }

      const patientIds = roster.map((p) => p.PatientID);

      // Per-patient counts in range + last log timestamp
      const countsSql = `
        SELECT pr.PatientID AS PatientID,
               SUM(CASE WHEN dl.Status = 'Taken'  THEN 1 ELSE 0 END) AS Taken,
               SUM(CASE WHEN dl.Status = 'Missed' THEN 1 ELSE 0 END) AS Missed,
               SUM(CASE WHEN dl.Status = 'Late'   THEN 1 ELSE 0 END) AS Late,
               COUNT(*) AS TotalDoses,
               MAX(dl.TimeTaken) AS LastLogAt
        FROM Dose_Logs dl
        JOIN Prescriptions pr ON pr.PrescriptionID = dl.PrescriptionID
        WHERE pr.PatientID IN (:patientIds)
          AND (:doctorId IS NULL OR pr.DoctorID = :doctorId)
          AND DATE(dl.TimeTaken) >= :from
          AND DATE(dl.TimeTaken) <= :to
        GROUP BY pr.PatientID
      `;

      const [countsRows] = await (Prescription.sequelize ?? DoseLog.sequelize)!.query(countsSql, {
        replacements: { patientIds, doctorId, from, to },
      });

      const countsMap = new Map<number, any>();
      for (const row of countsRows as any[]) {
        countsMap.set(Number(row.PatientID), row);
      }

      // Missed today count
      const today = utcDateString(0);
      const missedTodaySql = `
        SELECT pr.PatientID AS PatientID,
               SUM(CASE WHEN dl.Status IN ('Missed','Late') THEN 1 ELSE 0 END) AS MissedTodayCount
        FROM Dose_Logs dl
        JOIN Prescriptions pr ON pr.PrescriptionID = dl.PrescriptionID
        WHERE pr.PatientID IN (:patientIds)
          AND (:doctorId IS NULL OR pr.DoctorID = :doctorId)
          AND DATE(dl.TimeTaken) = :today
        GROUP BY pr.PatientID
      `;
      const [missedTodayRows] = await (Prescription.sequelize ?? DoseLog.sequelize)!.query(missedTodaySql, {
        replacements: { patientIds, doctorId, today },
      });
      const missedTodayMap = new Map<number, number>();
      for (const row of missedTodayRows as any[]) {
        missedTodayMap.set(Number(row.PatientID), Number(row.MissedTodayCount ?? 0));
      }

      const patients: DoctorDashboardPatientRow[] = roster.map((p) => {
        const c = countsMap.get(p.PatientID);
        const taken = Number(c?.Taken ?? 0);
        const missed = Number(c?.Missed ?? 0);
        const late = Number(c?.Late ?? 0);
        const total = Number(c?.TotalDoses ?? 0);
        const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0;
        const missedToday = missedTodayMap.get(p.PatientID) ?? 0;
        const lastLogAt = c?.LastLogAt ? new Date(c.LastLogAt).toISOString() : null;
        return {
          PatientID: p.PatientID,
          FirstName: p.FirstName,
          LastName: p.LastName,
          ActiveRxCount: p.ActiveRxCount,
          TotalDoses: total,
          Taken: taken,
          Missed: missed,
          Late: late,
          AdherencePct: adherencePct,
          MissedTodayCount: missedToday,
          LastLogAt: lastLogAt,
        };
      });

      // Aggregate + patients-below-threshold
      const agg = patients.reduce(
        (acc, p) => {
          acc.TotalDoses += p.TotalDoses;
          acc.Taken += p.Taken;
          acc.Missed += p.Missed;
          acc.Late += p.Late;
          return acc;
        },
        { TotalDoses: 0, Taken: 0, Missed: 0, Late: 0 },
      );
      const overallAdherencePct = agg.TotalDoses > 0 ? Math.round((agg.Taken / agg.TotalDoses) * 100) : 0;
      const lowThreshold = req.query.lowThresholdPct ? Number(req.query.lowThresholdPct) : 80;
      const patientsBelow = patients.filter((p) => p.TotalDoses > 0 && p.AdherencePct < lowThreshold).length;

      // Trend by day in range
      const trendSql = `
        SELECT DATE(dl.TimeTaken) AS Date,
               SUM(CASE WHEN dl.Status = 'Taken'  THEN 1 ELSE 0 END) AS Taken,
               SUM(CASE WHEN dl.Status = 'Missed' THEN 1 ELSE 0 END) AS Missed,
               SUM(CASE WHEN dl.Status = 'Late'   THEN 1 ELSE 0 END) AS Late,
               COUNT(*) AS TotalDoses
        FROM Dose_Logs dl
        JOIN Prescriptions pr ON pr.PrescriptionID = dl.PrescriptionID
        WHERE pr.PatientID IN (:patientIds)
          AND (:doctorId IS NULL OR pr.DoctorID = :doctorId)
          AND DATE(dl.TimeTaken) >= :from
          AND DATE(dl.TimeTaken) <= :to
        GROUP BY DATE(dl.TimeTaken)
        ORDER BY DATE(dl.TimeTaken) ASC
      `;
      const [trendRows] = await (Prescription.sequelize ?? DoseLog.sequelize)!.query(trendSql, {
        replacements: { patientIds, doctorId, from, to },
      });
      const trend = (trendRows as any[]).map((r) => {
        const taken = Number(r.Taken ?? 0);
        const total = Number(r.TotalDoses ?? 0);
        return {
          Date: new Date(r.Date).toISOString().slice(0, 10),
          Taken: taken,
          Missed: Number(r.Missed ?? 0),
          Late: Number(r.Late ?? 0),
          TotalDoses: total,
          AdherencePct: total > 0 ? Math.round((taken / total) * 100) : 0,
        };
      });

      // Alerts (simple rule-based)
      const alerts: DoctorDashboardResponse['alerts'] = [];
      for (const p of patients) {
        if (p.TotalDoses > 0 && p.AdherencePct < lowThreshold) {
          alerts.push({
            type: 'low_adherence',
            PatientID: p.PatientID,
            message: `${p.FirstName} ${p.LastName} is below ${lowThreshold}% adherence (${p.AdherencePct}%).`,
          });
        }
        if (p.MissedTodayCount > 0) {
          alerts.push({
            type: 'missed_today',
            PatientID: p.PatientID,
            message: `${p.FirstName} ${p.LastName} has ${p.MissedTodayCount} missed/late dose(s) today.`,
          });
        }
        if (p.LastLogAt) {
          const daysSince = Math.floor((Date.now() - new Date(p.LastLogAt).getTime()) / (1000 * 60 * 60 * 24));
          const noRecentThreshold = req.query.noRecentLogsDays ? Number(req.query.noRecentLogsDays) : 7;
          if (daysSince >= noRecentThreshold) {
            alerts.push({
              type: 'no_recent_logs',
              PatientID: p.PatientID,
              message: `${p.FirstName} ${p.LastName} has no logs in the last ${noRecentThreshold} days.`,
            });
          }
        }
      }

      const payload: DoctorDashboardResponse = {
        scope: { doctorId, from, to },
        aggregate: {
          ...agg,
          AdherencePct: overallAdherencePct,
          Patients: patients.length,
          PatientsBelowPct: patientsBelow,
        },
        trend,
        alerts,
        patients,
      };

      return res.json(payload);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.get('/', authenticateJWT, requireRole('admin', 'secretary'), async (_req: Request, res: Response) => {
  try {
    const doctors = await Doctor.findAll({ order: [['LastName', 'ASC'], ['FirstName', 'ASC']] });
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateJWT, requireRole('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { FirstName, LastName, Specialty, ContactNumber } = req.body;
    if (!FirstName || !LastName) {
      return res.status(400).json({ error: 'FirstName and LastName are required' });
    }
    const doctor = await Doctor.create({ FirstName, LastName, Specialty, ContactNumber });
    res.status(201).json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    await doctor.update(req.body);
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    await doctor.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
