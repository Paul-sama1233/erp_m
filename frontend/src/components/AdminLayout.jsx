import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const menuItems = [
  { path: '/admin/dashboard',  label: 'Главная',   icon: '🏠' },
  { path: '/admin/materials',  label: 'Материалы', icon: '📦' },
  { path: '/admin/products',   label: 'Изделия',   icon: '🪑' },
  { path: '/admin/productions', label: 'Производство', icon: '🏭' },
  { path: '/admin/contracts',  label: 'Договоры',  icon: '📋' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={s.wrapper}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.logo}>FurnitureForge</div>
        <nav style={s.nav}>
          {menuItems.map(item => (
            <button
              key={item.path}
              style={{
                ...s.navItem,
                ...(location.pathname === item.path ? s.navItemActive : {})
              }}
              onClick={() => navigate(item.path)}
            >
              <span style={s.icon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={s.bottom}>
          <div style={s.userInfo}>
            <div style={s.username}>{user?.username}</div>
            <div style={s.role}>Администратор</div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

const s = {
  wrapper:  { display: 'flex', minHeight: '100vh', background: '#f5f6fa' },
  sidebar:  {
    width: 240, background: '#1e1b4b', display: 'flex',
    flexDirection: 'column', padding: '24px 0', position: 'fixed',
    top: 0, left: 0, bottom: 0,
  },
  logo:     {
    color: '#fff', fontWeight: 800, fontSize: 18,
    padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  nav:      { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' },
  navItem:  {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', borderRadius: 8, border: 'none',
    background: 'transparent', color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer', fontSize: 14, fontWeight: 500, textAlign: 'left',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
  },
  icon:     { fontSize: 18, width: 24, textAlign: 'center' },
  bottom:   {
    padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: 'auto',
  },
  userInfo: { marginBottom: 12 },
  username: { color: '#fff', fontWeight: 600, fontSize: 14 },
  role:     { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  logoutBtn:{ width: '100%', padding: '8px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              cursor: 'pointer', fontWeight: 500, fontSize: 14 },
  main:     { flex: 1, marginLeft: 240, minHeight: '100vh' },
};