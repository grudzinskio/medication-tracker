import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole } from '../auth/middleware';
import { searchDrugLabels } from '../services/drugLookup';

const router = Router();

router.get('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await searchDrugLabels(q);
    res.json({ results });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : 'Lookup failed';
    res.status(502).json({ error: msg });
  }
});

export default router;
