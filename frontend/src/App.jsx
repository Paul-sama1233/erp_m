import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import Materials from './pages/admin/Materials';
import Products from './pages/admin/Products';
import Productions from './pages/admin/Productions'
const AdminDashboard = () => (
  <div style={{ padding: 40 }}>
    <h1>👑 Дашборд администратора</h1>
    <p style={{ color: '#888', marginTop: 8 }}>Выберите раздел в меню слева</p>
  </div>
);

const WorkerDashboard = () => (
  <h1 style={{ padding: 40 }}>🔨 Дашборд работника</h1>
);

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
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="materials" element={<Materials />} />
            <Route path="products" element={<Products />} />
            <Route path="productions" element={<Productions />} />
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