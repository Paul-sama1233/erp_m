import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';   // ← Добавлено

const API = 'http://127.0.0.1:8000';

export default function WorkerTasks() {
  const { t } = useTranslation();                  // ← Добавлено

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [writeoffForm, setWriteoffForm] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    axios.get(`${API}/api/my-stages/`, { headers })
      .then(res => { setStages(res.data); setLoading(false); });
  }, [refreshKey]);

  const handleStart = async (stageId) => {
    setActionLoading(stageId);
    try {
      await axios.post(`${API}/api/stages/${stageId}/start/`, {}, { headers });
      refresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally { setActionLoading(null); }
  };

  const openWriteoff = (stage) => {
    const initQty = {};
    stage.available_materials.forEach(m => { initQty[m.id] = m.needed; });
    setQuantities(initQty);
    setWriteoffForm(stage);
  };

  const handleComplete = async () => {
    if (!writeoffForm) return;
    setActionLoading(writeoffForm.id);
    const materials = writeoffForm.available_materials
      .filter(m => parseFloat(quantities[m.id] || 0) > 0)
      .map(m => ({ material_id: m.id, quantity: parseFloat(quantities[m.id] || 0) }));

    try {
      await axios.post(`${API}/api/stages/${writeoffForm.id}/complete/`,
        { materials }, { headers });
      setWriteoffForm(null);
      setQuantities({});
      refresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally { setActionLoading(null); }
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  const active = stages.filter(s => s.status !== 'completed');
  const done   = stages.filter(s => s.status === 'completed');

  return (
    <div style={s.page}>
      <h2 style={s.title}>{t('worker.tasks.title')}</h2>

      {/* Модальное окно списания */}
      {writeoffForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ margin: '0 0 8px' }}>
              {t('worker.tasks.modal.title', { stage: t(`stages.${writeoffForm.stage_type}`) })}
            </h3>
            <p style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>
              {t('worker.tasks.modal.product')}: <strong>{writeoffForm.product_name}</strong>
            </p>

            {writeoffForm.available_materials.length === 0 ? (
              <p style={{ color: '#aaa', marginBottom: 16 }}>
                {t('worker.tasks.modal.noMaterials')}
              </p>
            ) : (
              <div style={{ marginBottom: 20 }}>
                {writeoffForm.available_materials.map(m => (
                  <div key={m.id} style={sw.row}>
                    <div style={sw.matInfo}>
                      <div style={sw.matName}>{m.name}</div>
                      <div style={sw.matStock}>
                        {t('worker.tasks.modal.stock')} {m.quantity} {m.unit} | {t('worker.tasks.modal.norm')} {m.needed}
                      </div>
                    </div>
                    <input
                      style={sw.input}
                      type="number"
                      step="0.01"
                      min="0"
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
                  ? t('worker.tasks.buttons.completing')
                  : t('worker.tasks.buttons.complete')}
              </button>
              <button style={s.cancelBtn} onClick={() => setWriteoffForm(null)}>
                {t('worker.tasks.buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {active.length === 0 && done.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div>{t('worker.tasks.empty.noTasks')}</div>
        </div>
      )}

      {active.length > 0 && (
        <>
          <h3 style={s.sectionTitle}>{t('worker.tasks.section.active')}</h3>
          <div style={s.grid}>
            {active.map(stage => (
              <div key={stage.id} style={s.card}>
                <div style={s.cardTop}>
                  <span style={s.productName}>{stage.product_name}</span>
                  <span style={{
                    ...s.badge,
                    background: '#dbeafe',
                    color: '#1d4ed8',
                  }}>
                    {t(`status.${stage.status}`)}
                  </span>
                </div>
                <div style={s.stageName}>
                  {t(`stages.${stage.stage_type}`)} • Этап #{stage.order}
                </div>
                {stage.production_date && (
                  <div style={s.date}>
                    📅 {new Date(stage.production_date).toLocaleDateString('ru-RU')}
                  </div>
                )}
                {stage.status === 'pending' && (
                  <button
                    style={s.startBtn}
                    onClick={() => handleStart(stage.id)}
                    disabled={actionLoading === stage.id}
                  >
                    {actionLoading === stage.id
                      ? t('worker.tasks.buttons.starting')
                      : t('worker.tasks.buttons.start')}
                  </button>
                )}
                {stage.status === 'in_progress' && (
                  <button style={s.completeBtn} onClick={() => openWriteoff(stage)}>
                    {t('worker.tasks.buttons.complete')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h3 style={{ ...s.sectionTitle, marginTop: 32 }}>
            {t('worker.tasks.section.completed')}
          </h3>
          <div style={s.grid}>
            {done.map(stage => (
              <div key={stage.id} style={{ ...s.card, opacity: 0.65 }}>
                <div style={s.cardTop}>
                  <span style={s.productName}>{stage.product_name}</span>
                  <span style={{ ...s.badge, background: '#dcfce7', color: '#16a34a' }}>
                    {t(`status.${stage.status}`)}
                  </span>
                </div>
                <div style={s.stageName}>{t(`stages.${stage.stage_type}`)}</div>
                {stage.completed_at && (
                  <div style={s.date}>
                    ✅ {new Date(stage.completed_at).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  page:         { padding: 32 },
  title:        { margin: '0 0 24px', fontSize: 22, fontWeight: 700 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#374151' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  empty:        { textAlign: 'center', padding: 60, color: '#aaa', fontSize: 18 },
  card:         { background: '#fff', borderRadius: 12, padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName:  { fontWeight: 700, fontSize: 15 },
  badge:        { padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  stageName:    { color: '#4f46e5', fontWeight: 600, fontSize: 14, marginBottom: 6 },
  date:         { color: '#888', fontSize: 13, marginBottom: 12 },
  startBtn:     { width: '100%', padding: 10, borderRadius: 8, border: 'none',
                  background: '#fef3c7', color: '#d97706', cursor: 'pointer', fontWeight: 600 },
  completeBtn:  { width: '100%', padding: 10, borderRadius: 8, border: 'none',
                  background: '#dcfce7', color: '#16a34a', cursor: 'pointer', fontWeight: 600 },
  cancelBtn:    { padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: '#f3f4f6', cursor: 'pointer', fontWeight: 600 },
  overlay:      { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.5)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:        { background: '#fff', borderRadius: 16, padding: 32,
                  width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
};

const sw = {
  row:     { display: 'flex', alignItems: 'center', gap: 12,
             padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  matInfo: { flex: 1 },
  matName: { fontWeight: 600, fontSize: 14 },
  matStock:{ color: '#888', fontSize: 12, marginTop: 2 },
  input:   { width: 90, padding: '8px', borderRadius: 8,
             border: '1px solid #ddd', fontSize: 14, textAlign: 'center' },
  unit:    { color: '#888', fontSize: 13, minWidth: 30 },
};