import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';   // ← Добавлено

const API = 'http://127.0.0.1:8000';

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();                  // ← Добавлено

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [writeoffForm, setWriteoffForm] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  const fetchStages = async () => {
    const res = await axios.get(`${API}/api/my-stages/`, { headers });
    setStages(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchStages(); }, [refreshKey]);

  // Начать этап
  const handleStart = async (stageId) => {
    setActionLoading(stageId);
    try {
      await axios.post(`${API}/api/stages/${stageId}/start/`, {}, { headers });
      refresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const [stats, setStats] = useState({ completed_this_month: 0 });
  useEffect(() => {
    axios.get(`${API}/api/worker-stats/`, { headers })
        .then(res => setStats(res.data))
        .catch(err => console.error(err));
}, []);
  // Открыть форму списания
  const openWriteoff = (stage) => {
    const initQty = {};
    stage.available_materials.forEach(m => {
      initQty[m.id] = m.needed;
    });
    setQuantities(initQty);
    setWriteoffForm(stage);
  };

  // Завершить этап
  const handleComplete = async () => {
    if (!writeoffForm) return;
    setActionLoading(writeoffForm.id);

    const materials = writeoffForm.available_materials
      .filter(m => parseFloat(quantities[m.id] || 0) > 0)
      .map(m => ({
        material_id: m.id,
        quantity: parseFloat(quantities[m.id] || 0),
      }));

    try {
      await axios.post(
        `${API}/api/stages/${writeoffForm.id}/complete/`,
        { materials },
        { headers }
      );
      setWriteoffForm(null);
      setQuantities({});
      refresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const pending = stages.filter(s => s.status === 'pending');
  const in_progress = stages.filter(s => s.status === 'in_progress');
  const completed = stages.filter(s => s.status === 'completed');

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      {/* Шапка */}
      <div style={s.topbar}>
        <div>
          <div style={s.greeting}>
            {t('worker.dashboard.greeting', { name: user?.username })}
          </div>
          <div style={s.subtitle}>{t('worker.dashboard.subtitle')}</div>
        </div>
        <button style={s.logoutBtn} onClick={logout}>
          {t('worker.dashboard.buttons.logout')}
        </button>
      </div>

      {/* Статистика */}
      <div style={s.stats}>
        <div style={{ ...s.statCard, borderTop: '4px solid #f59e0b' }}>
          <div style={s.statNum}>{pending.length}</div>
          <div style={s.statLabel}>{t('worker.dashboard.stats.pending')}</div>
        </div>
        <div style={{ ...s.statCard, borderTop: '4px solid #3b82f6' }}>
          <div style={s.statNum}>{in_progress.length}</div>
          <div style={s.statLabel}>{t('worker.dashboard.stats.inProgress')}</div>
        </div>
        <div style={{ ...s.statCard, borderTop: '4px solid #16a34a' }}>
          <div style={s.statNum}>{completed.length}</div>
          <div style={s.statLabel}>{t('worker.dashboard.stats.completed')}</div>
        </div>
        <div style={s.statCard}>
        <   h3>{stats.completed_this_month}</h3>
        <p>Выполнено за {t(`months.${stats.month_name}`)}</p>
        </div>
      </div>

      {/* Модальное окно списания */}
      {writeoffForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ margin: '0 0 8px' }}>
              {t('worker.dashboard.modal.title', {
                stage: t(`stages.${writeoffForm.stage_type}`)
              })}
            </h3>
            <p style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>
              {t('worker.dashboard.modal.description')}
            </p>

            {writeoffForm.available_materials.length === 0 ? (
              <p style={{ color: '#aaa', marginBottom: 16 }}>
                {t('worker.dashboard.modal.noMaterials')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {writeoffForm.available_materials.map(m => (
                  <div key={m.id} style={sw.row}>
                    <div style={sw.matInfo}>
                      <div style={sw.matName}>{m.name}</div>
                      <div style={sw.matStock}>
                        {t('worker.dashboard.modal.stock')} {m.quantity} {m.unit} | {t('worker.dashboard.modal.norm')} {m.needed}
                      </div>
                    </div>
                    <input
                      style={sw.input}
                      type="number"
                      step="0.01"
                      min="0"
                      max={m.quantity}
                      value={quantities[m.id] || ''}
                      onChange={e => setQuantities({ ...quantities, [m.id]: e.target.value })}
                    />
                    <span style={sw.unit}>{m.unit}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                style={s.completeBtn}
                onClick={handleComplete}
                disabled={actionLoading === writeoffForm.id}
              >
                {actionLoading === writeoffForm.id
                  ? t('worker.dashboard.buttons.completing')
                  : t('worker.dashboard.buttons.complete')}
              </button>
              <button style={s.cancelBtn} onClick={() => setWriteoffForm(null)}>
                {t('worker.dashboard.buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Этапы в работе */}
      {in_progress.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>{t('worker.dashboard.section.inProgress')}</h3>
          <div style={s.cards}>
            {in_progress.map(stage => (
              <div key={stage.id} style={c.card}>
                <div style={c.cardTop}>
                  <span style={c.productName}>{stage.product_name}</span>
                  <span style={{
                    ...c.badge,
                    background: '#dbeafe',
                    color: '#1d4ed8',
                  }}>
                    {t(`status.${stage.status}`)}
                  </span>
                </div>
                <div style={c.stageName}>{t(`stages.${stage.stage_type}`)}</div>
                <div style={c.date}>
                  📅 {new Date(stage.production_date).toLocaleDateString('ru-RU')}
                </div>
                <div style={c.order}>Этап #{stage.order}</div>
                <button style={c.completeBtn} onClick={() => openWriteoff(stage)}>
                  {t('worker.dashboard.buttons.complete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ожидающие */}
      {pending.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>{t('worker.dashboard.section.pending')}</h3>
          <div style={s.cards}>
            {pending.map(stage => (
              <div key={stage.id} style={c.card}>
                <div style={c.cardTop}>
                  <span style={c.productName}>{stage.product_name}</span>
                  <span style={{
                    ...c.badge,
                    background: '#fef9c3',
                    color: '#854d0e',
                  }}>
                    {t(`status.${stage.status}`)}
                  </span>
                </div>
                <div style={c.stageName}>{t(`stages.${stage.stage_type}`)}</div>
                <div style={c.date}>
                  📅 {new Date(stage.production_date).toLocaleDateString('ru-RU')}
                </div>
                <div style={c.order}>Этап #{stage.order + 1}</div>
                <button
                  style={c.startBtn}
                  onClick={() => handleStart(stage.id)}
                  disabled={actionLoading === stage.id}
                >
                  {actionLoading === stage.id
                    ? t('worker.dashboard.buttons.starting')
                    : t('worker.dashboard.buttons.start')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Завершённые */}
      {completed.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>{t('worker.dashboard.section.completed')}</h3>
          <div style={s.cards}>
            {completed.map(stage => (
              <div key={stage.id} style={{ ...c.card, opacity: 0.7 }}>
                <div style={c.cardTop}>
                  <span style={c.productName}>{stage.product_name}</span>
                  <span style={{
                    ...c.badge,
                    background: '#dcfce7',
                    color: '#16a34a',
                  }}>
                    {t(`status.${stage.status}`)}
                  </span>
                </div>
                <div style={c.stageName}>{t(`stages.${stage.stage_type}`)}</div>
                <div style={c.date}>
                  ✅ {stage.completed_at
                    ? new Date(stage.completed_at).toLocaleDateString('ru-RU')
                    : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stages.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div>{t('worker.dashboard.empty.noTasks')}</div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { minHeight: '100vh', background: '#f5f6fa', padding: 24 },
  topbar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                 marginBottom: 24, background: '#fff', padding: '16px 24px',
                 borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  greeting:    { fontWeight: 700, fontSize: 18 },
  subtitle:    { color: '#888', fontSize: 14, marginTop: 4 },
  logoutBtn:   { background: '#fee2e2', color: '#dc2626', border: 'none',
                 padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  stats:       { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                 gap: 16, marginBottom: 24 },
  statCard:    { background: '#fff', borderRadius: 12, padding: '20px 24px',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  statNum:     { fontSize: 32, fontWeight: 800, color: '#1e1b4b' },
  statLabel:   { color: '#888', fontSize: 14, marginTop: 4 },
  section:     { marginBottom: 24 },
  sectionTitle:{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#374151' },
  cards:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  empty:       { textAlign: 'center', padding: 60, color: '#aaa', fontSize: 18 },
  completeBtn: { width: '100%', padding: 10, borderRadius: 8, border: 'none',
                 background: '#dcfce7', color: '#16a34a', cursor: 'pointer',
                 fontWeight: 600, fontSize: 14 },
  cancelBtn:   { padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db',
                 background: '#f3f4f6', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  overlay:     { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                 background: 'rgba(0,0,0,0.5)', display: 'flex',
                 alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#fff', borderRadius: 16, padding: 32,
                 width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
};

const c = {
  card:        { background: '#fff', borderRadius: 12, padding: 20,
                 boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardTop:     { display: 'flex', justifyContent: 'space-between',
                 alignItems: 'center', marginBottom: 8 },
  productName: { fontWeight: 700, fontSize: 15 },
  badge:       { padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  stageName:   { color: '#4f46e5', fontWeight: 600, fontSize: 14, marginBottom: 4 },
  date:        { color: '#888', fontSize: 13, marginBottom: 4 },
  order:       { color: '#aaa', fontSize: 12, marginBottom: 12 },
  startBtn:    { width: '100%', padding: 10, borderRadius: 8, border: 'none',
                 background: '#fef3c7', color: '#d97706', cursor: 'pointer',
                 fontWeight: 600, fontSize: 14 },
  completeBtn: { width: '100%', padding: 10, borderRadius: 8, border: 'none',
                 background: '#dcfce7', color: '#16a34a', cursor: 'pointer',
                 fontWeight: 600, fontSize: 14 },
};

const sw = {
  row:      { display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  matInfo:  { flex: 1 },
  matName:  { fontWeight: 600, fontSize: 14 },
  matStock: { color: '#888', fontSize: 12, marginTop: 2 },
  input:    { width: 90, padding: '8px', borderRadius: 8,
              border: '1px solid #ddd', fontSize: 14, textAlign: 'center' },
  unit:     { color: '#888', fontSize: 13, minWidth: 30 },
};