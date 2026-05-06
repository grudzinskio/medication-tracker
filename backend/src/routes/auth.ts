import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import * as jwt from 'jsonwebtoken';
import sequelize from '../db/sequelize';
import type { JwtClaims, RoleName, UserType } from '../auth/types';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 60),
  standardHeaders: true,
  legacyHeaders: false,
});

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn'];

type DbUserRow = {
  UserID: number;
  Username: string;
  Password: string;
  UserType: UserType;
  PatientID: number | null;
  DoctorID: number | null;
};

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const [rows] = await sequelize.query(
      `
      SELECT u.UserID, u.Username, u.Password, u.UserType, u.PatientID, u.DoctorID
      FROM Users u
      WHERE u.Username = :username
      LIMIT 1
      `,
      { replacements: { username } },
    );

    const row = (rows as any[])[0] as DbUserRow | undefined;
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    if (row.Password !== password) return res.status(401).json({ error: 'Invalid credentials' });

    const [roleRows] = await sequelize.query(
      `
      SELECT r.Name
      FROM UserRoles ur
      JOIN Roles r ON r.RoleID = ur.RoleID
      WHERE ur.UserID = :userId
      `,
      { replacements: { userId: row.UserID } },
    );

    const roles = (roleRows as any[]).map((r) => r.Name) as RoleName[];

    const claims: JwtClaims = {
      sub: row.UserID,
      username: row.Username,
      userType: row.UserType,
      roles,
      patientId: row.PatientID ?? null,
      doctorId: row.DoctorID ?? null,
    };

    const token = jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      token,
      user: {
        userId: row.UserID,
        username: row.Username,
        userType: row.UserType,
        roles,
        patientId: row.PatientID ?? null,
        doctorId: row.DoctorID ?? null,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

