import { Router, Request, Response } from 'express';
import { DoseLog } from '../models';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
  try {
    const { PrescriptionID, Status, TimeTaken } = req.body;
    if (!PrescriptionID || !Status) {
      return res.status(400).json({ error: 'PrescriptionID and Status are required' });
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
