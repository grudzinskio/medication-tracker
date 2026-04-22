import {
  Activity,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Pill,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/patients',      label: 'Patients',       icon: UserRound },
  { to: '/medications',   label: 'Medications',    icon: Pill },
  { to: '/prescriptions', label: 'Prescriptions',  icon: ClipboardList },
  { to: '/doctors',       label: 'Doctors',        icon: Stethoscope },
  { to: '/pharmacies',    label: 'Pharmacies',     icon: Building2 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roles = user?.roles ?? [];

  const visibleNavItems = navItems.filter((item) => {
    if (roles.includes('admin')) return true;
    if (roles.includes('doctor')) {
      // Doctors can work with prescribing + reference data
      return ['/dashboard', '/prescriptions', '/medications', '/pharmacies'].includes(item.to);
    }
    // Patients only get their dashboard experience
    return ['/dashboard'].includes(item.to);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 shadow-sm">
              <Activity className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">Medication Tracker</div>
              <div className="text-xs text-slate-500">Careful adherence, made simple</div>
            </div>
          </div>

          {/* Primary nav */}
          <nav aria-label="Primary">
            <ul className="flex items-center gap-1">
              {visibleNavItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      [
                        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-slate-800">{user.username}</div>
                <div className="text-[11px] text-slate-500">{user.roles.join(', ')}</div>
              </div>
            ) : null}
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
