import { Router, Request, Response } from 'express';
import { fn, col, where as seqWhere, Op } from 'sequelize';
import { Doctor, DoseLog, Medication, Patient, Prescription } from '../models';
import sequelize from '../db/sequelize';
import { authenticateJWT, requireRole, requireSelfPatientOrAdmin } from '../auth/middleware';

const router = Router();

// ─── CRUD ─────────────────────────────────────────────────────────────────────

router.get('/', authenticateJWT, requireRole('admin', 'doctor', 'secretary'), async (_req: Request, res: Response) => {
  try {
    const user = _req.user!;
    const where: any = {};

    // Doctors should only see their own patients (i.e., patients with at least one prescription by that doctor).
    if (user.roles.includes('doctor')) {
      const doctorId = user.doctorId;
      if (!doctorId) return res.json([]);
      where.PatientID = {
        [Op.in]: (await Prescription.findAll({
          where: { DoctorID: doctorId },
          attributes: [[fn('DISTINCT', col('PatientID')), 'PatientID']],
          raw: true,
        })).map((r: any) => r.PatientID as number),
      };
    }

    const patients = await Patient.findAll({
      where,
      order: [['LastName', 'ASC'], ['FirstName', 'ASC']],
    });
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put(
  '/:id/primary-doctor',
  authenticateJWT,
  requireRole('admin', 'secretary'),
  async (req: Request, res: Response) => {
    try {
      const patient = await Patient.findByPk(req.params.id);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const { PrimaryDoctorID } = req.body ?? {};
      if (PrimaryDoctorID !== null && PrimaryDoctorID !== undefined) {
        const parsed = Number(PrimaryDoctorID);
        if (!Number.isFinite(parsed) || parsed < 1) {
          return res.status(400).json({ error: 'PrimaryDoctorID must be a positive number or null' });
        }
        const exists = await Doctor.findByPk(parsed);
        if (!exists) return res.status(404).json({ error: 'Doctor not found' });
        await patient.update({ PrimaryDoctorID: parsed });
      } else {
        await patient.update({ PrimaryDoctorID: null });
      }

      return res.json(patient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.get(
  '/:id',
  authenticateJWT,
  async (req: Request, res: Response, next) => {
    const user = req.user!;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    if (user.roles.includes('admin')) return next();
    if (user.roles.includes('patient') && user.patientId === id) return next();
    if (user.roles.includes('doctor') && user.doctorId) {
      const link = await Prescription.findOne({
        where: { PatientID: id, DoctorID: user.doctorId },
      });
      if (link) return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  },
  async (req: Request, res: Response) => {
    try {
      const patient = await Patient.findByPk(req.params.id);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      res.json(patient);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { FirstName, LastName, Email } = req.body;
    if (!FirstName || !LastName || !Email) {
      return res.status(400).json({ error: 'FirstName, LastName, and Email are required' });
    }
    const patient = await Patient.create({ FirstName, LastName, Email });
    res.status(201).json(patient);
  } catch (err: any) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'A patient with that email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    await patient.update(req.body);
    res.json(patient);
  } catch (err: any) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'A patient with that email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    await patient.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Daily Schedule ───────────────────────────────────────────────────────────

router.get(
  '/:id/daily-schedule',
  authenticateJWT,
  (req, res, next) => {
    // Patients: only self. Doctors/Admins: any patient.
    if (req.user?.roles.includes('doctor') || req.user?.roles.includes('admin')) return next();
    return requireSelfPatientOrAdmin('id')(req, res, next);
  },
  async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    const prescriptions = await Prescription.findAll({
      where: {
        PatientID: patientId,
        StartDate: { [Op.lte]: today },
        [Op.or]: [{ EndDate: null }, { EndDate: { [Op.gte]: today } }],
      },
      include: [
        { model: Medication, as: 'Medication' },
        { model: Doctor,     as: 'Doctor' },
      ],
    });

    const schedule = await Promise.all(
      prescriptions.map(async (rx) => {
        const plain = rx.toJSON() as any;

        const todayLog = await DoseLog.findOne({
          where: {
            PrescriptionID: rx.PrescriptionID,
            [Op.and]: seqWhere(fn('DATE', col('TimeTaken')), today),
          },
          order: [['TimeTaken', 'DESC']],
        });

        return {
          PrescriptionID:  plain.PrescriptionID,
          PatientID:       plain.PatientID,
          DrugName:        plain.Medication?.DrugName   ?? '',
          GenericName:     plain.Medication?.GenericName ?? '',
          Form:            plain.Medication?.Form        ?? '',
          Route:           plain.Medication?.Route       ?? '',
          Dosage:          plain.Dosage,
          Frequency:       plain.Frequency,
          DoctorFirstName: plain.Doctor?.FirstName ?? '',
          DoctorLastName:  plain.Doctor?.LastName  ?? '',
          TodayLog:        todayLog ? todayLog.toJSON() : null,
        };
      }),
    );

    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
  },
);

// ─── Adherence Summary ────────────────────────────────────────────────────────

router.get(
  '/:id/adherence',
  authenticateJWT,
  (req, res, next) => {
    // Patients: only self. Doctors/Admins: any patient.
    if (req.user?.roles.includes('doctor') || req.user?.roles.includes('admin')) return next();
    return requireSelfPatientOrAdmin('id')(req, res, next);
  },
  async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const from = (req.query.from as string) ?? new Date().toISOString().slice(0, 10);
    const to   = (req.query.to   as string) ?? new Date().toISOString().slice(0, 10);

    const prescriptions = await Prescription.findAll({
      where: { PatientID: patientId },
      attributes: ['PrescriptionID'],
    });

    const rxIds = prescriptions.map((p) => (p as any).PrescriptionID as number);

    if (rxIds.length === 0) {
      return res.json({ PatientID: patientId, TotalDoses: 0, Taken: 0, Missed: 0, Late: 0, AdherencePct: 0 });
    }

    const logs = await DoseLog.findAll({
      where: {
        PrescriptionID: { [Op.in]: rxIds },
        [Op.and]: [
          seqWhere(fn('DATE', col('TimeTaken')), { [Op.gte]: from }),
          seqWhere(fn('DATE', col('TimeTaken')), { [Op.lte]: to }),
        ],
      },
    });

    const taken  = logs.filter((l) => l.Status === 'Taken').length;
    const missed = logs.filter((l) => l.Status === 'Missed').length;
    const late   = logs.filter((l) => l.Status === 'Late').length;
    const total  = logs.length;

    res.json({
      PatientID:    patientId,
      TotalDoses:   total,
      Taken:        taken,
      Missed:       missed,
      Late:         late,
      AdherencePct: total > 0 ? Math.round((taken / total) * 100) : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
  },
);

// ─── Clinical awareness (educational demo — not medical advice) ────────────────

router.get(
  '/:id/clinical-warnings',
  authenticateJWT,
  async (req: Request, res: Response, next) => {
    const user = req.user!;
    if (user.roles.includes('doctor') || user.roles.includes('admin')) return next();
    return requireSelfPatientOrAdmin('id')(req, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.id, 10);
      const user = req.user!;
      const patient = await Patient.findByPk(patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      if (user.roles.includes('patient') && user.patientId !== patientId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (user.roles.includes('doctor')) {
        const doctorId = user.doctorId;
        if (!doctorId) return res.status(403).json({ error: 'Forbidden' });
        const link = await Prescription.findOne({
          where: { PatientID: patientId, DoctorID: doctorId },
        });
        if (!link) return res.status(403).json({ error: 'Forbidden' });
      }

      const today = new Date().toISOString().slice(0, 10);

      const [dupSameDrug] = await sequelize.query(
        `
        SELECT pr.MedID, m.DrugName, COUNT(*) AS cnt
        FROM Prescriptions pr
        JOIN Medications m ON m.MedID = pr.MedID
        WHERE pr.PatientID = :patientId
          AND pr.StartDate <= :today
          AND (pr.EndDate IS NULL OR pr.EndDate >= :today)
        GROUP BY pr.MedID, m.DrugName
        HAVING COUNT(*) > 1
        `,
        { replacements: { patientId, today } },
      );

      const [dupGeneric] = await sequelize.query(
        `
        SELECT m.GenericName,
               GROUP_CONCAT(DISTINCT m.DrugName ORDER BY m.DrugName SEPARATOR ', ') AS DrugNames,
               GROUP_CONCAT(DISTINCT pr.MedID ORDER BY pr.MedID SEPARATOR ',') AS MedIDs
        FROM Prescriptions pr
        JOIN Medications m ON m.MedID = pr.MedID
        WHERE pr.PatientID = :patientId
          AND m.GenericName IS NOT NULL AND TRIM(m.GenericName) <> ''
          AND pr.StartDate <= :today
          AND (pr.EndDate IS NULL OR pr.EndDate >= :today)
        GROUP BY m.GenericName
        HAVING COUNT(DISTINCT pr.MedID) > 1
        `,
        { replacements: { patientId, today } },
      );

      const [interactions] = await sequelize.query(
        `
        SELECT i.MedID_1, i.MedID_2, i.Note,
               m1.DrugName AS DrugName_1, m2.DrugName AS DrugName_2
        FROM Medication_Interactions i
        JOIN Medications m1 ON m1.MedID = i.MedID_1
        JOIN Medications m2 ON m2.MedID = i.MedID_2
        WHERE EXISTS (
          SELECT 1 FROM Prescriptions p1
          WHERE p1.PatientID = :patientId AND p1.MedID = i.MedID_1
            AND p1.StartDate <= :today AND (p1.EndDate IS NULL OR p1.EndDate >= :today)
        )
        AND EXISTS (
          SELECT 1 FROM Prescriptions p2
          WHERE p2.PatientID = :patientId AND p2.MedID = i.MedID_2
            AND p2.StartDate <= :today AND (p2.EndDate IS NULL OR p2.EndDate >= :today)
        )
        `,
        { replacements: { patientId, today } },
      );

      res.json({
        disclaimer:
          'Educational demonstration only — not medical advice. Always consult a qualified clinician or pharmacist.',
        duplicateTherapySameDrug: (dupSameDrug as any[]).map((r) => ({
          MedID: r.MedID,
          DrugName: r.DrugName,
          count: Number(r.cnt),
        })),
        duplicateTherapySameGeneric: (dupGeneric as any[]).map((r) => ({
          GenericName: r.GenericName,
          DrugNames: String(r.DrugNames).split(',').map((s: string) => s.trim()),
          MedIDs: String(r.MedIDs)
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !Number.isNaN(n)),
        })),
        interactionHints: (interactions as any[]).map((r) => ({
          MedID_1: r.MedID_1,
          MedID_2: r.MedID_2,
          DrugName_1: r.DrugName_1,
          DrugName_2: r.DrugName_2,
          Note: r.Note,
        })),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
