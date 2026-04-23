import { Building2, ClipboardList, LayoutDashboard, Pill, Stethoscope, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const cards = [
  { to: '/doctors', label: 'Doctors', desc: 'Create, edit, and remove providers.', icon: Stethoscope },
  { to: '/patients', label: 'Patients', desc: 'Manage patient records and access.', icon: UserRound },
  { to: '/pharmacies', label: 'Pharmacies', desc: 'Maintain pharmacy directory.', icon: Building2 },
  { to: '/medications', label: 'Medications', desc: 'Reference medication catalog.', icon: Pill },
  { to: '/prescriptions', label: 'Prescriptions', desc: 'Oversee active prescriptions.', icon: ClipboardList },
  { to: '/doctor-dashboard', label: 'Clinical overview', desc: 'Population adherence and alerts.', icon: LayoutDashboard },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Manager console</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Manage people, reference data, and operational workflows.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50/40"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-teal-100 group-hover:text-teal-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{label}</div>
                <div className="mt-0.5 text-sm text-slate-600">{desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

