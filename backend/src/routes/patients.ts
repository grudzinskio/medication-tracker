import { Router, Request, Response } from 'express';
import { fn, col, where as seqWhere, Op } from 'sequelize';
import { Doctor, DoseLog, Medication, Patient, Prescription } from '../models';

const router = Router();

// ─── CRUD ─────────────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const patients = await Patient.findAll({ order: [['LastName', 'ASC'], ['FirstName', 'ASC']] });
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
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

router.put('/:id', async (req: Request, res: Response) => {
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

router.delete('/:id', async (req: Request, res: Response) => {
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

router.get('/:id/daily-schedule', async (req: Request, res: Response) => {
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
});

// ─── Adherence Summary ────────────────────────────────────────────────────────

router.get('/:id/adherence', async (req: Request, res: Response) => {
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
});

export default router;
