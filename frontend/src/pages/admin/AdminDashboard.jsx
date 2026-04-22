import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // <-- Импорт хука

const API = 'http://127.0.0.1:8000';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation(); // <-- Инициализация
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/api/dashboard-stats/`, { headers })
      .then(res => { setStats(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;
  if (!stats)  return <p style={{ padding: 40 }}>{t('common.error')}</p>; // Используем базовый перевод ошибки

  const statCards = [
    { label: t('admin.dashboard.stats.materials'),   value: stats.total_materials,     icon: '📦', color: '#3b82f6', path: '/admin/materials' },
    { label: t('admin.dashboard.stats.lowStock'),    value: stats.low_stock_materials, icon: '⚠️', color: '#ef4444', path: '/admin/materials' },
    { label: t('admin.dashboard.stats.products'),    value: stats.total_products,      icon: '🪑', color: '#8b5cf6', path: '/admin/products' },
    { label: t('admin.dashboard.stats.productions'), value: stats.total_productions,   icon: '🏭', color: '#f59e0b', path: '/admin/productions' },
    { label: t('admin.dashboard.stats.active'),      value: stats.active_productions,  icon: '🔨', color: '#10b981', path: '/admin/productions' },
    { label: t('admin.dashboard.stats.contracts'),   value: stats.total_contracts,     icon: '📋', color: '#6366f1', path: '/admin/contracts' },
    { label: t('admin.dashboard.stats.persons'),     value: stats.total_persons,       icon: '👷', color: '#14b8a6', path: '/admin/persons' },
    { label: t('admin.dashboard.stats.requests'),    value: stats.pending_requests,    icon: '🛒', color: '#f97316', path: '/admin/supply' },
  ];

  return (
    <div style={s.page}>
      <h2 style={s.title}>{t('dashboard.title')}</h2>

      {/* Карточки статистики */}
      <div style={s.grid}>
        {statCards.map((card, i) => (
          <div key={i} style={{ ...s.card, borderTop: `4px solid ${card.color}` }}
            onClick={() => navigate(card.path)}>
            <div style={s.cardIcon}>{card.icon}</div>
            <div style={{ ...s.cardValue, color: card.color }}>{card.value}</div>
            <div style={s.cardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={s.bottom}>
        {/* Последние производства */}
        <div style={s.block}>
          <h3 style={s.blockTitle}>🏭 {t('admin.dashboard.recent.title')}</h3>
          {stats.recent_productions.length === 0 ? (
            <p style={s.empty}>{t('admin.dashboard.empty')}</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={{ background: '#f9f9f9' }}>
                  <th style={s.th}>{t('admin.dashboard.recent.table.product')}</th>
                  <th style={s.th}>{t('admin.dashboard.recent.table.client')}</th>
                  <th style={s.th}>{t('admin.dashboard.recent.table.date')}</th>
                  <th style={s.th}>{t('admin.dashboard.recent.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_productions.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={s.td}>{p.product_name}</td>
                    <td style={s.td}>{p.client_name}</td>
                    <td style={s.td}>
                      {/* Динамический язык для даты */}
                      {new Date(p.created_at).toLocaleDateString(i18n.language)}
                    </td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: p.status === 'started' ? '#dbeafe' : '#dcfce7',
                        color:      p.status === 'started' ? '#1d4ed8' : '#16a34a',
                      }}>
                        {/* Использование глобального словаря статусов */}
                        {p.status === 'started' ? t('status.in_progress') : t('status.completed')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Материалы с низким остатком */}
        <div style={s.block}>
          <h3 style={s.blockTitle}>⚠️ {t('admin.dashboard.lowStock.title')}</h3>
          {stats.low_stock.length === 0 ? (
            <p style={s.empty}>{t('admin.dashboard.lowStock.allGood')} ✅</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.low_stock.map(m => (
                <div key={m.id} style={s.lowStockItem}>
                  <span style={s.matName}>{m.name}</span>
                  <span style={s.matQty}>
                    {m.quantity} / {m.min_quantity} {m.unit}
                  </span>
                  <div style={s.progressBar}>
                    <div style={{
                      ...s.progressFill,
                      width: `${Math.min(100, (m.quantity / m.min_quantity) * 100)}%`,
                      background: m.quantity <= 0 ? '#ef4444' : '#f97316',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:         { padding: 32 },
  title:        { margin: '0 0 24px', fontSize: 22, fontWeight: 700 },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16, marginBottom: 32 },
  card:         { background: '#fff', borderRadius: 12, padding: '20px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
                  transition: 'transform 0.15s', textAlign: 'center' },
  cardIcon:     { fontSize: 28, marginBottom: 8 },
  cardValue:    { fontSize: 32, fontWeight: 800, marginBottom: 4 },
  cardLabel:    { fontSize: 12, color: '#888', fontWeight: 500 },
  bottom:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  block:        { background: '#fff', borderRadius: 12, padding: 24,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  blockTitle:   { margin: '0 0 16px', fontSize: 16, fontWeight: 700 },
  empty:        { color: '#aaa', textAlign: 'center', padding: 20 },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13 },
  td:           { padding: '10px 12px', fontSize: 14 },
  badge:        { padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  lowStockItem: { padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  matName:      { fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 4 },
  matQty:       { fontSize: 12, color: '#888', display: 'block', marginBottom: 6 },
  progressBar:  { height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
};