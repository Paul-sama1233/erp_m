import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40 }}>Загрузка...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole)
    return <Navigate to="/login" replace />;

  return children;
}