import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import WorkerLayout from './components/WorkerLayout'; // ИСПРАВЛЕНО (из components)
import Materials from './pages/admin/Materials';
import Products from './pages/admin/Products';
import Productions from './pages/admin/Productions';
import Contracts from './pages/admin/Contracts';
import Supply from './pages/admin/Supply';
import Persons from './pages/admin/Persons';
import AdminDashboard from './pages/admin/AdminDashboard';
import Reports from './pages/admin/Reports';
import ProductDetail from './pages/admin/ProductDetail';
import PersonDetail from './pages/admin/PersonDetail';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerTasks from './pages/worker/WorkerTasks';
import WorkerCalendar from './pages/worker/WorkerCalendar';
import WorkerProfile from './pages/worker/WorkerProfile'; // НОВАЯ СТРАНИЦА
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? "/admin/dashboard" : "/worker/dashboard"} replace />;
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            {/* Admin */}
            <Route path="/admin" element={<PrivateRoute allowedRole="admin"><AdminLayout /></PrivateRoute>}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="materials" element={<Materials />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="persons" element={<Persons />} />
              <Route path="persons/:id" element={<PersonDetail />} />
              <Route path="productions" element={<Productions />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="supply" element={<Supply />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Worker */}
            <Route path="/worker" element={<PrivateRoute allowedRole="worker"><WorkerLayout /></PrivateRoute>}>
              <Route path="dashboard" element={<WorkerDashboard />} />
              <Route path="tasks" element={<WorkerTasks />} />
              <Route path="calendar" element={<WorkerCalendar />} />
              <Route path="profile" element={<WorkerProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nextProvider>
  );
}