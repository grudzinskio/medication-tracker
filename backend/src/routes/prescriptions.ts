import { Router, Request, Response } from 'express';
import { Prescription } from '../models';
import sequelize from '../db/sequelize';
import { authenticateJWT, requireRole } from '../auth/middleware';

const router = Router();

router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const where: Record<string, number> = {};
    const requestedPatientId = req.query.patientId
      ? parseInt(req.query.patientId as string, 10)
      : undefined;

    if (user.roles.includes('patient')) {
      where.PatientID = user.patientId ?? -1;
    } else if (user.roles.includes('doctor')) {
      where.DoctorID = user.doctorId ?? -1;
      if (requestedPatientId) where.PatientID = requestedPatientId;
    } else if (user.roles.includes('pharmacy_tech')) {
      // Pharmacy techs can review prescriptions for fulfillment workflows.
      if (requestedPatientId) where.PatientID = requestedPatientId;
    } else if (user.roles.includes('admin')) {
      if (requestedPatientId) where.PatientID = requestedPatientId;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
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

router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const prescription = await Prescription.findByPk(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    if (user.roles.includes('patient')) {
      if (user.patientId !== (prescription as any).PatientID) return res.status(403).json({ error: 'Forbidden' });
    } else if (user.roles.includes('doctor')) {
      if (user.doctorId !== (prescription as any).DoctorID) return res.status(403).json({ error: 'Forbidden' });
    } else if (!user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateJWT, requireRole('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { PatientID, MedID, DoctorID, PharmacyID, Dosage, Frequency, StartDate, EndDate } = req.body;
    if (!PatientID || !MedID || !DoctorID || !PharmacyID || !Dosage || !StartDate) {
      return res.status(400).json({ error: 'PatientID, MedID, DoctorID, PharmacyID, Dosage, and StartDate are required' });
    }

    if (user.roles.includes('doctor') && user.doctorId !== DoctorID) {
      return res.status(403).json({ error: 'Forbidden' });
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

router.put('/:id', authenticateJWT, requireRole('admin', 'doctor', 'pharmacy_tech'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const prescription = await Prescription.findByPk(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    if (user.roles.includes('doctor') && user.doctorId !== (prescription as any).DoctorID) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = { ...req.body } as any;
    if ('EndDate' in updates && !updates.EndDate) updates.EndDate = null;

    if (user.roles.includes('doctor') && 'DoctorID' in updates && updates.DoctorID !== user.doctorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (user.roles.includes('pharmacy_tech')) {
      const allowed = new Set(['PharmacyID', 'EndDate']);
      const keys = Object.keys(updates);
      const forbiddenKeys = keys.filter((k) => !allowed.has(k));
      if (forbiddenKeys.length > 0) {
        return res.status(403).json({ error: `Forbidden fields: ${forbiddenKeys.join(', ')}` });
      }
    }

    await prescription.update(updates);
    res.json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateJWT, requireRole('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const prescription = await Prescription.findByPk(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    if (user.roles.includes('doctor') && user.doctorId !== (prescription as any).DoctorID) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prescription.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
