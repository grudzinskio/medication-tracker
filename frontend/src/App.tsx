import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Medications from './pages/Medications';
import Patients from './pages/Patients';
import Pharmacies from './pages/Pharmacies';
import Prescriptions from './pages/Prescriptions';
import Login from './pages/Login';
import { useAuth } from './auth/AuthContext';
import { setAuthToken } from './services/api';
import { useEffect } from 'react';
import RequireRole from './auth/RequireRole';
import { useMemo } from 'react';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, user } = useAuth();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const homePath = useMemo(() => {
    const roles = user?.roles ?? [];
    if (roles.includes('admin')) return '/patients';
    if (roles.includes('doctor')) return '/dashboard';
    return '/dashboard';
  }, [user?.roles]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to={homePath} replace />} />
          <Route
            path="dashboard"
            element={
              <RequireRole anyOf={['admin', 'patient', 'doctor']}>
                <Dashboard />
              </RequireRole>
            }
          />
          <Route
            path="patients"
            element={
              <RequireRole anyOf={['admin', 'doctor']}>
                <Patients />
              </RequireRole>
            }
          />
          <Route
            path="medications"
            element={
              <RequireRole anyOf={['admin', 'doctor']}>
                <Medications />
              </RequireRole>
            }
          />
          <Route
            path="prescriptions"
            element={
              <RequireRole anyOf={['admin', 'doctor']}>
                <Prescriptions />
              </RequireRole>
            }
          />
          <Route
            path="doctors"
            element={
              <RequireRole anyOf={['admin']}>
                <Doctors />
              </RequireRole>
            }
          />
          <Route
            path="pharmacies"
            element={
              <RequireRole anyOf={['admin', 'doctor']}>
                <Pharmacies />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
