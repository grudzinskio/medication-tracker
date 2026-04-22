import { Router, Request, Response } from 'express';
import { DoseLog } from '../models';
import sequelize from '../db/sequelize';
import { authenticateJWT, requireRole } from '../auth/middleware';

const router = Router();

router.get('/', authenticateJWT, requireRole('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const where: Record<string, number> = {};
    if (req.query.prescriptionId) {
      where.PrescriptionID = parseInt(req.query.prescriptionId as string, 10);
    }
    const logs = await DoseLog.findAll({
      where,
      order: [['TimeTaken', 'DESC']],
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateJWT, requireRole('patient', 'admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { PrescriptionID, Status, TimeTaken } = req.body;
    if (!PrescriptionID || !Status) {
      return res.status(400).json({ error: 'PrescriptionID and Status are required' });
    }

    // Ownership enforcement:
    // - patient can only log doses for prescriptions belonging to their PatientID
    // - admin can log doses for any prescription
    if (user.roles.includes('patient')) {
      const [rows] = await sequelize.query(
        'SELECT PatientID FROM Prescriptions WHERE PrescriptionID = :rxId LIMIT 1',
        { replacements: { rxId: PrescriptionID } },
      );
      const row = (rows as any[])[0] as { PatientID: number } | undefined;
      if (!row) return res.status(404).json({ error: 'Prescription not found' });
      if (user.patientId !== row.PatientID) return res.status(403).json({ error: 'Forbidden' });
    }

    const log = await DoseLog.create({
      PrescriptionID,
      Status,
      TimeTaken: TimeTaken ? new Date(TimeTaken) : new Date(),
    });
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
