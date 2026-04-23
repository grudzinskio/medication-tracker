export type RoleName = 'patient' | 'doctor' | 'admin' | 'pharmacy_tech' | 'secretary';

export type UserType = 'patient' | 'doctor' | 'admin' | 'staff';

export type AuthUser = {
  userId: number;
  username: string;
  userType: UserType;
  roles: RoleName[];
  patientId: number | null;
  doctorId: number | null;
};

export type JwtClaims = {
  sub: number; // UserID
  username: string;
  userType: UserType;
  roles: RoleName[];
  patientId: number | null;
  doctorId: number | null;
};

