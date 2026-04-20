import { Router, Request, Response } from 'express';
import { Pharmacy } from '../models';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const pharmacies = await Pharmacy.findAll({ order: [['Name', 'ASC']] });
    res.json(pharmacies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pharmacy = await Pharmacy.findByPk(req.params.id);
    if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });
    res.json(pharmacy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { Name, Address, Phone } = req.body;
    if (!Name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const pharmacy = await Pharmacy.create({ Name, Address, Phone });
    res.status(201).json(pharmacy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pharmacy = await Pharmacy.findByPk(req.params.id);
    if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });
    await pharmacy.update(req.body);
    res.json(pharmacy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pharmacy = await Pharmacy.findByPk(req.params.id);
    if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });
    await pharmacy.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
