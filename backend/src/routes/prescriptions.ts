import { Router, Request, Response } from 'express';
import { Prescription } from '../models';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const where: Record<string, number> = {};
    if (req.query.patientId) {
      where.PatientID = parseInt(req.query.patientId as string, 10);
    }
    const prescriptions = await Prescription.findAll({
      where,
      order: [['PrescriptionID', 'ASC']],
    });
    res.json(prescriptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    res.json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { PatientID, MedID, DoctorID, PharmacyID, Dosage, Frequency, StartDate, EndDate } = req.body;
    if (!PatientID || !MedID || !DoctorID || !PharmacyID || !Dosage || !StartDate) {
      return res.status(400).json({ error: 'PatientID, MedID, DoctorID, PharmacyID, Dosage, and StartDate are required' });
    }
    const prescription = await Prescription.create({
      PatientID, MedID, DoctorID, PharmacyID, Dosage, Frequency,
      StartDate,
      EndDate: EndDate || null,
    });
    res.status(201).json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    const updates = { ...req.body };
    if ('EndDate' in updates && !updates.EndDate) updates.EndDate = null;
    await prescription.update(updates);
    res.json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    await prescription.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
