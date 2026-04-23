import { Router, Request, Response } from 'express';
import { fn, col, where as seqWhere, Op } from 'sequelize';
import { Doctor, DoseLog, Medication, Patient, Prescription } from '../models';
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

router.get('/:id', authenticateJWT, requireSelfPatientOrAdmin('id'), async (req: Request, res: Response) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

export default router;
