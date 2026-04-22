import { Router, Request, Response } from 'express';
import { Refill } from '../models';
import sequelize from '../db/sequelize';
import { authenticateJWT, requireRole } from '../auth/middleware';

const router = Router();

router.get('/', authenticateJWT, requireRole('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const where: Record<string, number> = {};
    if (req.query.prescriptionId) {
      where.PrescriptionID = parseInt(req.query.prescriptionId as string, 10);
    }
    const refills = await Refill.findAll({
      where,
      order: [['RefillDate', 'DESC']],
    });
    res.json(refills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateJWT, requireRole('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { PrescriptionID, RefillDate, QuantityDispensed } = req.body;
    if (!PrescriptionID || !RefillDate || !QuantityDispensed) {
      return res.status(400).json({ error: 'PrescriptionID, RefillDate, and QuantityDispensed are required' });
    }
    if (QuantityDispensed < 1) {
      return res.status(400).json({ error: 'QuantityDispensed must be at least 1' });
    }

    // Ownership enforcement:
    // Doctor can only create refills for prescriptions where DoctorID matches.
    if (user.roles.includes('doctor')) {
      const [rows] = await sequelize.query(
        'SELECT DoctorID FROM Prescriptions WHERE PrescriptionID = :rxId LIMIT 1',
        { replacements: { rxId: PrescriptionID } },
      );
      const row = (rows as any[])[0] as { DoctorID: number } | undefined;
      if (!row) return res.status(404).json({ error: 'Prescription not found' });
      if (user.doctorId !== row.DoctorID) return res.status(403).json({ error: 'Forbidden' });
    }

    const refill = await Refill.create({ PrescriptionID, RefillDate, QuantityDispensed });
    res.status(201).json(refill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
