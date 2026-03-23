import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import Materials from './pages/admin/Materials';
import Products from './pages/admin/Products';
import Productions from './pages/admin/Productions';
import Contracts from './pages/admin/Contracts';
import Supply from './pages/admin/Supply';
import Persons from './pages/admin/Persons';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Reports from './pages/admin/Reports';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRole="admin">
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard"   element={<AdminDashboard />} />
            <Route path="materials"   element={<Materials />} />
            <Route path="products"    element={<Products />} />
            <Route path="productions" element={<Productions />} />
            <Route path="contracts"   element={<Contracts />} />
            <Route path="supply"      element={<Supply />} />
            <Route path="persons"     element={<Persons />} />
            <Route path="reports"     element={<Reports />} />
          </Route>

          <Route
            path="/worker/dashboard"
            element={
              <PrivateRoute allowedRole="worker">
                <WorkerDashboard />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}