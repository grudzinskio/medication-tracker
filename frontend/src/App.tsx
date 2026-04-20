import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Medications from './pages/Medications';
import Patients from './pages/Patients';
import Pharmacies from './pages/Pharmacies';
import Prescriptions from './pages/Prescriptions';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="patients"      element={<Patients />} />
          <Route path="medications"   element={<Medications />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="doctors"       element={<Doctors />} />
          <Route path="pharmacies"    element={<Pharmacies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
