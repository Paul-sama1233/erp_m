import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';   // ← Добавлено

const menuItems = [
  { path: '/worker/dashboard', key: 'dashboard' },
  { path: '/worker/tasks',     key: 'tasks' },
  { path: '/worker/calendar',  key: 'calendar' },
];

export default function WorkerLayout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();                  // ← Добавлено
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={s.wrapper}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.avatar}>{user?.username?.charAt(0).toUpperCase()}</div>
          <div>
            <div style={s.username}>{user?.username}</div>
            <div style={s.role}>{t('worker.layout.role')}</div>
          </div>
        </div>

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
              <span style={s.icon}>
                {item.key === 'dashboard' && '🏠'}
                {item.key === 'tasks' && '🪑'}
                {item.key === 'calendar' && '📅'}
              </span>
              {t(`worker.layout.menu.${item.key}`)}
            </button>
          ))}
        </nav>

        <button
          style={s.logoutBtn}
          onClick={() => { logout(); navigate('/login'); }}
        >
          {t('worker.layout.buttons.logout')}
        </button>
      </aside>

      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

const s = {
  wrapper:     { display: 'flex', minHeight: '100vh', background: '#f5f6fa' },
  sidebar:     { width: 240, background: '#1e1b4b', display: 'flex',
                 flexDirection: 'column', padding: '24px 0',
                 position: 'fixed', top: 0, left: 0, bottom: 0 },
  logo:        { display: 'flex', alignItems: 'center', gap: 12,
                 padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                 marginBottom: 16 },
  avatar:      { width: 40, height: 40, borderRadius: '50%', background: '#4f46e5',
                 color: '#fff', display: 'flex', alignItems: 'center',
                 justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  username:    { color: '#fff', fontWeight: 700, fontSize: 14 },
  role:        { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  nav:         { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' },
  navItem:     { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                 borderRadius: 8, border: 'none', background: 'transparent',
                 color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14,
                 fontWeight: 500, textAlign: 'left' },
  navItemActive:{ background: 'rgba(255,255,255,0.15)', color: '#fff' },
  icon:        { fontSize: 18, width: 24, textAlign: 'center' },
  logoutBtn:   { margin: '16px 12px 0', padding: '10px', borderRadius: 8,
                 border: 'none', background: 'rgba(255,255,255,0.1)',
                 color: '#fff', cursor: 'pointer', fontWeight: 500 },
  main:        { flex: 1, marginLeft: 240, minHeight: '100vh' },
};