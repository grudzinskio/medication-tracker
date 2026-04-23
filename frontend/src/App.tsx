import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import Doctors from './pages/Doctors';
import Medications from './pages/Medications';
import Patients from './pages/Patients';
import Pharmacies from './pages/Pharmacies';
import Prescriptions from './pages/Prescriptions';
import PharmacyTechDashboard from './pages/PharmacyTechDashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';
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
    if (roles.includes('admin')) return '/admin';
    if (roles.includes('doctor')) return '/doctor-dashboard';
    if (roles.includes('pharmacy_tech')) return '/pharmacy-tech';
    if (roles.includes('secretary')) return '/secretary';
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
              <RequireRole anyOf={['admin', 'patient']}>
                <Dashboard />
              </RequireRole>
            }
          />
          <Route
            path="admin"
            element={
              <RequireRole anyOf={['admin']}>
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="doctor-dashboard"
            element={
              <RequireRole anyOf={['admin', 'doctor']}>
                <DoctorDashboard />
              </RequireRole>
            }
          />
          <Route
            path="pharmacy-tech"
            element={
              <RequireRole anyOf={['admin', 'pharmacy_tech']}>
                <PharmacyTechDashboard />
              </RequireRole>
            }
          />
          <Route
            path="secretary"
            element={
              <RequireRole anyOf={['admin', 'secretary']}>
                <SecretaryDashboard />
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
