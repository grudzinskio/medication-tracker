import { Router, Request, Response } from 'express';
import { Doctor } from '../models';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const doctors = await Doctor.findAll({ order: [['LastName', 'ASC'], ['FirstName', 'ASC']] });
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
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

router.put('/:id', async (req: Request, res: Response) => {
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

router.delete('/:id', async (req: Request, res: Response) => {
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
