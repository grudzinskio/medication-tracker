import { Activity, Lock, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login as apiLogin, setAuthToken } from '../services/api';

function roleHome(roles: string[]) {
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('doctor')) return '/doctor-dashboard';
  if (roles.includes('pharmacy_tech')) return '/pharmacy-tech';
  if (roles.includes('secretary')) return '/secretary';
  return '/dashboard';
}

export default function Login() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = useMemo(() => {
    const state = location.state as any;
    return state?.from?.pathname as string | undefined;
  }, [location.state]);

  if (token) return <Navigate to={from ?? '/'} replace />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(13,148,136,0.15),transparent)]"
        aria-hidden
      />
      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Brand panel — desktop */}
        <aside
          className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-800 px-12 py-14 text-white lg:flex"
          aria-hidden
        >
          <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-emerald-900/40 blur-3xl" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
              <Activity className="h-7 w-7 text-white" aria-hidden />
            </div>
            <h2 className="mt-10 max-w-sm text-3xl font-semibold tracking-tight text-white">
              Medication Tracker
            </h2>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-teal-100">
              Careful adherence, made simple. Sign in to manage prescriptions and care workflows.
            </p>
          </div>
          <p className="relative text-sm text-teal-200/90">
            Secure access for authorized staff and patients.
          </p>
        </aside>

        {/* Form */}
        <main className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            {/* Compact brand — mobile */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 shadow-md shadow-teal-600/25">
                <Activity className="h-6 w-6 text-white" aria-hidden />
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold text-slate-900">Medication Tracker</div>
                <div className="text-xs text-slate-500">Careful adherence, made simple</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Enter your username and password to continue to your workspace.
              </p>

              <form
                className="mt-8 space-y-5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setSubmitting(true);
                  try {
                    const { token: newToken, user } = await apiLogin(username.trim(), password);
                    setAuthToken(newToken);
                    login(newToken, user);
                    navigate(from ?? roleHome(user.roles), { replace: true });
                  } catch (err: any) {
                    setError(err?.message ?? 'Login failed');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <label className="block">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <User className="h-4 w-4 text-slate-400" aria-hidden />
                    Username
                  </div>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15"
                    placeholder="Your username"
                    autoComplete="username"
                  />
                </label>

                <label className="block">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Lock className="h-4 w-4 text-slate-400" aria-hidden />
                    Password
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                  />
                </label>

                {error ? (
                  <div
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:pointer-events-none disabled:opacity-55"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
