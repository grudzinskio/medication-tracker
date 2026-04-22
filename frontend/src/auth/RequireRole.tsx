import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { RoleName } from './types';

export default function RequireRole({
  anyOf,
  children,
}: {
  anyOf: RoleName[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (anyOf.some((r) => user.roles.includes(r))) return <>{children}</>;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">No access</h2>
      <p className="mt-1 text-sm text-slate-600">
        Your account doesn’t have permission to view this page.
      </p>
    </div>
  );
}

