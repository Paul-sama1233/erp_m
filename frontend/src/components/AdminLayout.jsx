import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const menuItems = [
  { path: '/admin/dashboard',   key: 'dashboard',   icon: '📊' },
  { path: '/admin/materials',   key: 'materials',   icon: '📦' },
  { path: '/admin/products',    key: 'products',    icon: '🪑' },
  { path: '/admin/productions', key: 'productions', icon: '🏭' },
  { path: '/admin/contracts',   key: 'contracts',   icon: '📋' },
  { path: '/admin/supply',      key: 'supply',      icon: '🚚' },
  { path: '/admin/persons',     key: 'persons',     icon: '👷' },
  { path: '/admin/reports',     key: 'reports',     icon: '📈' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Оставляем логику проверки темы, чтобы CSS-переменные подхватывались корректно
  const [isDark] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [isDark]);

  return (
    <div style={s.wrapper}>
      <aside style={s.sidebar}>
        <div style={s.logo}>Wallman</div>
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
          {/* КНОПКА ТЕМЫ УДАЛЕНА */}

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

          <div style={s.userBlock}>
            <div style={s.avatar}>{user?.username?.charAt(0).toUpperCase()}</div>
            <div style={s.userInfo}>
              <div style={s.username}>{user?.username}</div>
              <div style={s.role}>{t('admin.layout.role')}</div>
            </div>
            <button style={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }} title={t('admin.layout.buttons.logout')}>
              🚪
            </button>
          </div>
        </div>
      </aside>
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

const s = {
  wrapper:       { display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #f5f6fa)', color: 'var(--text-main, #1f2937)', transition: '0.3s' },
  sidebar:       { width: 240, background: 'var(--sidebar-bg, #1c1917)', display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, boxShadow: '4px 0 10px rgba(0,0,0,0.2)' },
  logo:          { color: '#ffffff', fontSize: 24, fontWeight: 800, padding: '0 24px', marginBottom: 32, letterSpacing: '0.5px' },
  nav:           { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' },
  navItem:       { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 15, fontWeight: 500, textAlign: 'left', transition: 'all 0.2s' },
  navItemActive: { background: 'var(--sidebar-active, #65a30d)', color: '#ffffff' },
  icon:          { fontSize: 18, width: 24, textAlign: 'center' },
  bottom:        { padding: '0 16px', marginTop: 'auto' },
  langSwitcher:  { marginBottom: 16 },
  langSelect:    { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13, cursor: 'pointer', outline: 'none' },
  userBlock:     { display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 },
  avatar:        { width: 36, height: 36, borderRadius: '50%', background: 'var(--sidebar-active, #65a30d)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 },
  userInfo:      { flex: 1, overflow: 'hidden' },
  username:      { color: '#ffffff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' },
  role:          { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  logoutBtn:     { background: 'transparent', border: 'none', color: '#ffffff', fontSize: 18, cursor: 'pointer', padding: 4, opacity: 0.7 },
  main:          { flex: 1, marginLeft: 240, minHeight: '100vh', paddingBottom: 40 }
};