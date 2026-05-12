import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

const menuItems = [
  { path: '/worker/dashboard', key: 'dashboard', label: 'Главная', icon: '📊' },
  { path: '/worker/tasks',     key: 'tasks',     label: 'Задачи',  icon: '🪑' },
  { path: '/worker/calendar',  key: 'calendar',  label: 'Календарь', icon: '📅' },
];

export default function WorkerLayout() {
  const { user, setUser, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Синхронизация языка при загрузке
  useEffect(() => {
    if (user?.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user, i18n]);

  const handleLanguageChange = async (newLang) => {
    i18n.changeLanguage(newLang);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/api/me/`,
        { language: newLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (setUser && user) {
        setUser({ ...user, language: newLang });
      }
    } catch (err) {
      console.error("Ошибка сохранения языка", err);
    }
  };

  return (
    <div style={s.wrapper}>
      {/* ЛЕВАЯ ПАНЕЛЬ (САЙДБАР) */}
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
              {t(`worker.layout.menu.${item.key}`, item.label)}
            </button>
          ))}
        </nav>

        <div style={s.bottom}>
          <div style={s.langSwitcher}>
             <select
              style={s.langSelect}
              value={i18n.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="ru" style={{color: '#fff'}}>Русский</option>
              <option value="uz" style={{color: '#fff'}}>O'zbek</option>
              <option value="en" style={{color: '#fff'}}>English</option>
            </select>
          </div>

          <div style={s.userBlock}>
            <div style={s.avatar}>{user?.username?.charAt(0).toUpperCase()}</div>
            <div style={s.userInfo}>
              <div style={s.username}>{user?.username}</div>
              <div style={s.role}>{t('worker.layout.role', 'Работник цеха')}</div>
            </div>
          </div>

          {/* КНОПКА ВЫХОДА */}
          <button
            style={s.logoutBtn}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Выйти из системы
          </button>
        </div>
      </aside>

      {/* ПРАВАЯ ЧАСТЬ (КОНТЕНТ) */}
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

const s = {
  wrapper: { display: 'flex', minHeight: '100vh', background: '#f4f7f6' },

  // ТЕМНО-СЕРЫЙ ФОН САЙДБАРА КАК В АДМИНКЕ
  sidebar: {
    width: 260,
    background: '#242424',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100
  },

  logo: { color: '#ffffff', fontSize: 24, fontWeight: 800, padding: '0 24px', marginBottom: 32 },
  nav:  { flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '0 12px' },

  // СТИЛЬ ОБЫЧНОГО (НЕВЫБРАННОГО) ПУНКТА МЕНЮ
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#a3a3a3', // Светло-серый текст
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 500,
    textAlign: 'left',
    transition: '0.2s'
  },

  // СТИЛЬ АКТИВНОГО (ВЫБРАННОГО) ПУНКТА МЕНЮ - САЛАТОВЫЙ
  navItemActive: {
    background: '#84bb16', // Салатовый цвет
    color: '#ffffff',      // Белый текст
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(132,204,22,0.25)'
  },

  icon: { fontSize: 18, width: 24, textAlign: 'center' },
  bottom: { padding: '0 16px', marginTop: 'auto' },
  langSwitcher: { marginBottom: 16 },
  langSelect: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    background: '#333333',
    color: '#fff',
    border: '1px solid #444',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none'
  },
  userBlock: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '0 8px' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#84cc16', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  userInfo: { flex: 1, overflow: 'hidden' },
  username: { color: '#ffffff', fontSize: 14, fontWeight: 600 },
  role: { color: '#888888', fontSize: 12 },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    background: 'transparent',
    color: '#f87171',
    border: '1px solid rgba(248,113,113,0.3)',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: '0.2s'
  },
  main: { flex: 1, marginLeft: 260, padding: '32px' }
};