import type { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import type { AuthUser, JwtClaims, RoleName } from './types';

declare global {
  // eslint-disable-next-line no-var
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

function forbidden(res: Response, message = 'Forbidden') {
  return res.status(403).json({ error: message });
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization') ?? req.header('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const token = authHeader.slice('bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtClaims;
    req.user = {
      userId: decoded.sub,
      username: decoded.username,
      userType: decoded.userType,
      roles: decoded.roles,
      patientId: decoded.patientId ?? null,
      doctorId: decoded.doctorId ?? null,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (roles.some((r) => user.roles.includes(r))) return next();
    return forbidden(res);
  };
}

export function requireSelfPatientOrAdmin(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (user.roles.includes('admin')) return next();
    if (!user.roles.includes('patient')) return forbidden(res);
    const id = parseInt(req.params[paramName], 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    if (user.patientId === id) return next();
    return forbidden(res);
  };
}

