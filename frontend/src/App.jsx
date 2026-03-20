import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Materials from './pages/admin/Materials';

// Временные заглушки для дашбордов (заменим позже)
const AdminDashboard  = () => (
<div style={{padding:40}}>
    <h1>👑 Дашборд администратора</h1>
    <a href="/admin/materials">📦 Материалы</a>
  </div>
);
const WorkerDashboard = () => <h1 style={{padding:40}}>🔨 Дашборд работника</h1>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin/dashboard" element={
            <PrivateRoute allowedRole="admin">
              <AdminDashboard />
            </PrivateRoute>
          }/>

          <Route path="/admin/materials" element={
             <PrivateRoute allowedRole="admin">
                <Materials />
             </PrivateRoute>
          } />

          <Route path="/worker/dashboard" element={
            <PrivateRoute allowedRole="worker">
              <WorkerDashboard />
            </PrivateRoute>
          }/>

          {/* Любой другой путь → логин */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}