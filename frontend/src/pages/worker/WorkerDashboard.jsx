import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API = 'http://127.0.0.1:8000';

const STAGE_LABELS = {
  frame:      'Каркас',
  springs:    'Пружины / Механизмы',
  sewing:     'Шитьё',
  foam:       'Поролон',
  upholstery: 'Обивка',
};

const STATUS_CONFIG = {
  pending:     { label: 'Ожидает',   color: '#f59e0b', next: 'in_progress', nextLabel: '▶ Начать работу' },
  in_progress: { label: 'В работе',  color: '#3b82f6', next: 'completed',   nextLabel: '✅ Завершить' },
  completed:   { label: 'Завершено', color: '#16a34a', next: null,          nextLabel: null },
};

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const [stages, setStages]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  const fetchStages = async () => {
    const res = await axios.get(`${API}/api/my-stages/`, { headers });
    setStages(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchStages(); }, [refreshKey]);

  const handleStatusChange = async (stageId, newStatus) => {
    const now = new Date().toISOString();
    const data = { status: newStatus };
    if (newStatus === 'in_progress') data.started_at = now;
    if (newStatus === 'completed')   data.completed_at = now;

    await axios.patch(
      `${API}/api/production-stages/${stageId}/`,
      data,
      { headers }
    );
    refresh();
  };

  const pending     = stages.filter(s => s.status === 'pending');
  const in_progress = stages.filter(s => s.status === 'in_progress');
  const completed   = stages.filter(s => s.status === 'completed');

  if (loading) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={s.page}>
      {/* Шапка */}
      <div style={s.topbar}>
        <div>
          <div style={s.greeting}>Добро пожаловать, {user?.username}!</div>
          <div style={s.subtitle}>Ваши задачи на производстве</div>
        </div>
        <button style={s.logoutBtn} onClick={logout}>Выйти</button>
      </div>

      {/* Статистика */}
      <div style={s.stats}>
        <div style={{ ...s.statCard, borderTop: '4px solid #f59e0b' }}>
          <div style={s.statNum}>{pending.length}</div>
          <div style={s.statLabel}>Ожидают</div>
        </div>
        <div style={{ ...s.statCard, borderTop: '4px solid #3b82f6' }}>
          <div style={s.statNum}>{in_progress.length}</div>
          <div style={s.statLabel}>В работе</div>
        </div>
        <div style={{ ...s.statCard, borderTop: '4px solid #16a34a' }}>
          <div style={s.statNum}>{completed.length}</div>
          <div style={s.statLabel}>Завершено</div>
        </div>
      </div>

      {/* Этапы в работе — показываем первыми */}
      {in_progress.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>🔨 Сейчас в работе</h3>
          <div style={s.cards}>
            {in_progress.map(stage => (
              <StageCard key={stage.id} stage={stage} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {/* Ожидающие */}
      {pending.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>⏳ Ожидают начала</h3>
          <div style={s.cards}>
            {pending.map(stage => (
              <StageCard key={stage.id} stage={stage} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {/* Завершённые */}
      {completed.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>✅ Завершённые</h3>
          <div style={s.cards}>
            {completed.map(stage => (
              <StageCard key={stage.id} stage={stage} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {stages.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div>Нет назначенных задач</div>
        </div>
      )}
    </div>
  );
}

function StageCard({ stage, onStatusChange }) {
  const config = STATUS_CONFIG[stage.status];

  return (
    <div style={c.card}>
      <div style={c.cardTop}>
        <span style={c.productName}>{stage.product_name}</span>
        <span style={{
          ...c.badge,
          background: config.color + '20',
          color: config.color,
        }}>
          {config.label}
        </span>
      </div>
      <div style={c.stageName}>{STAGE_LABELS[stage.stage_type]}</div>
      <div style={c.date}>
        📅 {new Date(stage.production_date).toLocaleDateString('ru-RU')}
      </div>
      {config.next && (
        <button
          style={{
            ...c.actionBtn,
            background: stage.status === 'pending' ? '#fef3c7' : '#dcfce7',
            color: stage.status === 'pending' ? '#d97706' : '#16a34a',
          }}
          onClick={() => onStatusChange(stage.id, config.next)}>
          {config.nextLabel}
        </button>
      )}
    </div>
  );
}

const s = {
  page:         { minHeight: '100vh', background: '#f5f6fa', padding: 24 },
  topbar:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 24, background: '#fff', padding: '16px 24px',
                  borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  greeting:     { fontWeight: 700, fontSize: 18 },
  subtitle:     { color: '#888', fontSize: 14, marginTop: 4 },
  logoutBtn:    { background: '#fee2e2', color: '#dc2626', border: 'none',
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  stats:        { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16, marginBottom: 24 },
  statCard:     { background: '#fff', borderRadius: 12, padding: '20px 24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  statNum:      { fontSize: 32, fontWeight: 800, color: '#1e1b4b' },
  statLabel:    { color: '#888', fontSize: 14, marginTop: 4 },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#374151' },
  cards:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  empty:        { textAlign: 'center', padding: 60, color: '#aaa', fontSize: 18 },
};

const c = {
  card:        { background: '#fff', borderRadius: 12, padding: 20,
                 boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardTop:     { display: 'flex', justifyContent: 'space-between',
                 alignItems: 'center', marginBottom: 8 },
  productName: { fontWeight: 700, fontSize: 15 },
  badge:       { padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  stageName:   { color: '#4f46e5', fontWeight: 600, fontSize: 14, marginBottom: 8 },
  date:        { color: '#888', fontSize: 13, marginBottom: 12 },
  actionBtn:   { width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                 cursor: 'pointer', fontWeight: 600, fontSize: 14 },
};