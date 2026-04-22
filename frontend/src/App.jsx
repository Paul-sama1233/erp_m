import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import WorkerLayout   from './pages/worker/WorkerLayout';
import WorkerHome     from './pages/worker/WorkerHome';
import WorkerTasks    from './pages/worker/WorkerTasks';
import WorkerCalendar from './pages/worker/WorkerCalendar';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// === Компонент для обработки корневого маршрута (/) ===
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40 }}>Загрузка...</div>;

  // Если не авторизован — на логин
  if (!user) return <Navigate to="/login" replace />;

  // Если авторизован — по ролям
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'worker') return <Navigate to="/worker/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Базовый маршрут */}
            <Route path="/" element={<RootRedirect />} />

            <Route path="/login" element={<Login />} />

            {/* Admin роуты */}
            <Route path="/admin" element={
              <PrivateRoute allowedRole="admin">
                <AdminLayout />
              </PrivateRoute>
            }>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="materials" element={<Materials />} />
              <Route path="products" element={<Products />} />
              <Route path="productions" element={<Productions />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="supply" element={<Supply />} />
              <Route path="persons" element={<Persons />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Worker роуты */}
            <Route path="/worker" element={
              <PrivateRoute allowedRole="worker">
                <WorkerLayout />
              </PrivateRoute>
            }>
              <Route path="dashboard" element={<WorkerDashboard />} />
              <Route path="tasks" element={<WorkerTasks />} />
              <Route path="calendar" element={<WorkerCalendar />} />
            </Route>

            {/* Перехватчик всех неизвестных адресов (404) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nextProvider>
  );
}