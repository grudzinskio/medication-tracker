import { Router, Request, Response } from 'express';
import { Medication } from '../models';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const medications = await Medication.findAll({ order: [['DrugName', 'ASC']] });
    res.json(medications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const med = await Medication.findByPk(req.params.id);
    if (!med) return res.status(404).json({ error: 'Medication not found' });
    res.json(med);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { DrugName, GenericName, Form, Route, Manufacturer, UnitType } = req.body;
    if (!DrugName) {
      return res.status(400).json({ error: 'DrugName is required' });
    }
    const med = await Medication.create({ DrugName, GenericName, Form, Route, Manufacturer, UnitType });
    res.status(201).json(med);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const med = await Medication.findByPk(req.params.id);
    if (!med) return res.status(404).json({ error: 'Medication not found' });
    await med.update(req.body);
    res.json(med);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const med = await Medication.findByPk(req.params.id);
    if (!med) return res.status(404).json({ error: 'Medication not found' });
    await med.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
