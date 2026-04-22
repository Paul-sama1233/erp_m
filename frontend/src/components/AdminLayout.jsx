import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // ← Добавлен импорт

const menuItems = [
  { path: '/admin/dashboard',   key: 'dashboard',   icon: '🏠' },
  { path: '/admin/materials',   key: 'materials',   icon: '📦' },
  { path: '/admin/products',    key: 'products',    icon: '🪑' },
  { path: '/admin/productions', key: 'productions', icon: '🏭' },
  { path: '/admin/contracts',   key: 'contracts',   icon: '📋' },
  { path: '/admin/supply',      key: 'supply',      icon: '🚚' },
  { path: '/admin/persons',     key: 'persons',     icon: '👷' },
  { path: '/admin/reports',     key: 'reports',     icon: '📊' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation(); // ← Инициализация хука
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
              {t(`admin.layout.menu.${item.key}`)}
            </button>
          ))}
        </nav>
        <div style={s.bottom}>

          {/* Выбор языка */}
          <div style={s.langSwitcher}>
            <select
              style={s.langSelect}
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="ru" style={{color: '#000'}}>Русский</option>
              <option value="uz" style={{color: '#000'}}>O'zbek</option>
              <option value="en" style={{color: '#000'}}>English</option>
            </select>
          </div>

          <div style={s.userInfo}>
            <div style={s.username}>{user?.username}</div>
            <div style={s.role}>{t('admin.layout.role')}</div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>
            {t('admin.layout.buttons.logout')}
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
  langSwitcher: { marginBottom: 16 },
  langSelect: {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none'
  },
  userInfo: { marginBottom: 12 },
  username: { color: '#fff', fontWeight: 600, fontSize: 14 },
  role:     { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  logoutBtn:{ width: '100%', padding: '8px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              cursor: 'pointer', fontWeight: 500, fontSize: 14 },
  main:     { flex: 1, marginLeft: 240, minHeight: '100vh' },
};