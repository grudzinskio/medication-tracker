import { Router, Request, Response } from 'express';
import { Refill } from '../models';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
  try {
    const { PrescriptionID, RefillDate, QuantityDispensed } = req.body;
    if (!PrescriptionID || !RefillDate || !QuantityDispensed) {
      return res.status(400).json({ error: 'PrescriptionID, RefillDate, and QuantityDispensed are required' });
    }
    if (QuantityDispensed < 1) {
      return res.status(400).json({ error: 'QuantityDispensed must be at least 1' });
    }
    const refill = await Refill.create({ PrescriptionID, RefillDate, QuantityDispensed });
    res.status(201).json(refill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
