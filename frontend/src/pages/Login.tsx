import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login as apiLogin, setAuthToken } from '../services/api';

function roleHome(roles: string[]) {
  if (roles.includes('admin')) return '/patients';
  if (roles.includes('doctor')) return '/prescriptions';
  return '/dashboard';
}

export default function Login() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = useMemo(() => {
    const state = location.state as any;
    return state?.from?.pathname as string | undefined;
  }, [location.state]);

  if (token) return <Navigate to={from ?? '/'} replace />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">
            Use your demo username and password.
          </p>

          <form
            className="mt-6 space-y-4"
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
              <div className="text-sm font-medium text-slate-700">Username</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                placeholder="admin OR doctor1 OR patient email"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-slate-700">Password</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                placeholder="password"
                type="password"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="text-xs text-slate-500">
              Demo password for all accounts is <span className="font-mono">password</span>.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

