import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

const STAGE_LABELS = {
  frame:      'Каркас',
  springs:    'Пружины / Механизмы',
  sewing:     'Шитьё',
  foam:       'Поролон',
  upholstery: 'Обивка',
};

const STATUS_LABELS = {
  pending:     { label: 'Ожидает',   color: '#f59e0b' },
  in_progress: { label: 'В работе',  color: '#3b82f6' },
  completed:   { label: 'Завершено', color: '#16a34a' },
};

export default function Productions() {
  const {t} = useTranslation();
  const [productions, setProductions] = useState([]);
  const [persons, setPersons]         = useState([]);
  const [contracts, setContracts]     = useState([]);
  const [expanded, setExpanded]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [completing, setCompleting]   = useState(null);
  const [editStage, setEditStage]     = useState(null);
  const [showQueue, setShowQueue]     = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    try {
      const [prod, pers, cont] = await Promise.all([
        axios.get(`${API}/api/productions/`, { headers }),
        axios.get(`${API}/api/persons/`, { headers }),
        axios.get(`${API}/api/contracts/`, { headers }),
      ]);
      setProductions(prod.data);
      setPersons(pers.data);
      setContracts(cont.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleStartFromQueue = async (itemId) => {
    try {
      await axios.post(`${API}/api/contract-products/${itemId}/start_production/`, {}, { headers });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  const handleComplete = async (id) => {
    if (!confirm(t('admin.productions.confirm.complete'))) return;
    setCompleting(id);
    try {
      await axios.post(`${API}/api/productions/${id}/complete/`, {}, { headers });
      alert(t('admin.productions.alert.completed'));
      fetchAll();
    } catch (err) {
      alert(t('admin.productions.alert.error'));
    } finally {
      setCompleting(null);
    }
  };

  const handleUpdateStage = async (e) => {
    e.preventDefault();
    await axios.patch(
      `${API}/api/production-stages/${editStage.id}/`,
      { assigned_worker: editStage.assigned_worker },
      { headers }
    );
    setEditStage(null);
    fetchAll();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.productions.confirm.delete'))) return;
    try {
      await axios.delete(`${API}/api/productions/${id}/`, { headers });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  const pendingItems = contracts.flatMap(c => {
    const items = [];
    c.items.forEach(item => {
      if (item.status === 'completed') return;

      const alreadyStartedCount = productions.filter(
        p => p.product === item.product && p.contract_info?.id === c.id
      ).length;

      const remainingQuantity = item.quantity - alreadyStartedCount;

      if (remainingQuantity > 0) {
        for (let i = 0; i < remainingQuantity; i++) {
          const currentNumber = alreadyStartedCount + i + 1;
          items.push({
            ...item,
            virtualId: `${item.id}_${currentNumber}`,
            client_name: c.client_name,
            contract_date: c.created_at,
            part_label: item.quantity > 1 ? `(№${currentNumber} из ${item.quantity})` : ''
          });
        }
      }
    });
    return items;
  });

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.productions.title')}</h2>
        <button style={s.queueBtn} onClick={() => setShowQueue(!showQueue)}>
          {showQueue ? '✕ Закрыть очередь' : `📥 Очередь заказов (${pendingItems.length})`}
        </button>
      </div>

      {showQueue && (
        <div style={s.queueBlock}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Ожидают запуска в производство</h3>
          {pendingItems.length === 0 ? (
            <p style={{ color: '#888' }}>Нет ожидающих заказов из договоров.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={s.th}>Клиент</th>
                  <th style={s.th}>Изделие</th>
                  <th style={s.th}>Дата договора</th>
                  <th style={s.th}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map(item => (
                  <tr key={item.virtualId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={s.td}><strong>{item.client_name}</strong></td>
                    <td style={s.td}>{item.product_name} {item.part_label}</td>
                    <td style={s.td}>{new Date(item.contract_date).toLocaleDateString('ru-RU')}</td>
                    <td style={s.td}>
                      <button style={s.startQueueBtn} onClick={() => handleStartFromQueue(item.id)}>
                        ▶ Запустить производство
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={s.list}>
        {productions.length === 0 && (
          <div style={s.empty}>{t('admin.productions.empty')}</div>
        )}
        {productions.map(prod => (
          <div key={prod.id} style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <span style={s.productName}>{prod.product_name}</span>
                {prod.contract_info && (
                  <span style={s.personName}>
                    📋 {prod.contract_info.client_name}
                  </span>
                )}
                <span style={s.date}>
                  {new Date(prod.created_at).toLocaleDateString('ru-RU')}
                </span>
                <span style={{
                  ...s.statusBadge,
                  background: prod.status === 'completed' ? '#dcfce7' :
                              prod.status === 'started'   ? '#dbeafe' : '#fef9c3',
                  color:      prod.status === 'completed' ? '#16a34a' :
                              prod.status === 'started'   ? '#1d4ed8' : '#854d0e',
                }}>
                  {t(`status.${prod.status}`)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={s.expandBtn}
                  onClick={() => setExpanded(expanded === prod.id ? null : prod.id)}>
                  {expanded === prod.id
                    ? t('common.hide')
                    : `${t('admin.productions.buttons.showStages')} (${prod.stages.length})`}
                </button>
                <button
                  style={{ ...s.completeBtn, opacity: completing === prod.id ? 0.6 : 1 }}
                  onClick={() => handleComplete(prod.id)}
                  disabled={completing === prod.id || prod.status === 'completed'}>
                  {completing === prod.id
                      ? t('admin.productions.buttons.completing')
                      : t('admin.productions.buttons.complete')}
                </button>
                <button style={s.delBtn} onClick={() => handleDelete(prod.id)}>
                  {t('common.delete')}
                </button>
              </div>
            </div>

            {expanded === prod.id && (
              <div style={s.stagesBlock}>
                <table style={s.table}>
                  <thead>
                    <tr style={{ background: '#f9f9f9' }}>
                      <th style={s.th}>{t('admin.productions.table.stage')}</th>
                      <th style={s.th}>{t('admin.productions.table.worker')}</th>
                      <th style={s.th}>{t('admin.productions.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prod.stages.map(stage => (
                      <tr key={stage.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={s.td}>{STAGE_LABELS[stage.stage_type] || stage.stage_type}</td>
                        <td style={s.td}>
                          {editStage?.id === stage.id ? (
                            <form onSubmit={handleUpdateStage} style={{ display: 'flex', gap: 8 }}>
                              <select style={s.select} required
                                value={editStage.assigned_worker}
                                onChange={e => setEditStage({ ...editStage, assigned_worker: e.target.value })}>
                                <option value="">— Назначить рабочего —</option>
                                {persons
                                  .filter(p => p.specialization === stage.stage_type || p.specialization === 'none')
                                  .map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                  ))
                                }
                              </select>
                              <button style={s.btn} type="submit">✓</button>
                              <button style={s.cancelBtn} type="button"
                                onClick={() => setEditStage(null)}>✕</button>
                            </form>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ color: stage.assigned_worker_name ? '#000' : '#dc2626', fontWeight: stage.assigned_worker_name ? 'normal' : '600' }}>
                                  {stage.assigned_worker_name || '⚠️ Не назначен'}
                              </span>
                              {prod.status !== 'completed' && stage.status !== 'completed' && (
                                <button style={s.editBtn}
                                  onClick={() => setEditStage({
                                    id: stage.id,
                                    stage_type: stage.stage_type,
                                    assigned_worker: stage.assigned_worker || '',
                                  })}>
                                  {t('common.edit')}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            ...s.badge,
                            background: STATUS_LABELS[stage.status]?.color + '20',
                            color: STATUS_LABELS[stage.status]?.color,
                          }}>
                            {STATUS_LABELS[stage.status]?.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page:          { padding: 32 },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:         { margin: 0, fontSize: 22, fontWeight: 700 },
  btn:           { background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  queueBtn:      { background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, boxShadow: '0 2px 4px rgba(16,185,129,0.3)' },
  startQueueBtn: { background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  cancelBtn:     { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  completeBtn:   { background: '#dcfce7', color: '#16a34a', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  select:        { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 },
  list:          { display: 'flex', flexDirection: 'column', gap: 12 },
  empty:         { textAlign: 'center', padding: 40, color: '#aaa', fontSize: 16 },
  queueBlock:    { background: '#f8f8ff', padding: 24, borderRadius: 12, marginBottom: 24, border: '2px solid #e2e8f0' },
  card:          { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' },
  productName:   { fontWeight: 700, fontSize: 16, marginRight: 12 },
  personName:    { color: '#666', fontSize: 14, marginRight: 12 },
  date:          { color: '#aaa', fontSize: 13 },
  expandBtn:     { background: '#f0f0ff', color: '#4f46e5', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 },
  delBtn:        { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  stagesBlock:   { borderTop: '1px solid #f0f0f0', padding: '16px 20px', background: '#fafafa' },
  table:         { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th:            { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#475569' },
  td:            { padding: '10px 12px', fontSize: 14 },
  badge:         { padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  editBtn:       { background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontWeight: 500, fontSize: 12 },
  statusBadge:   { padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12, marginLeft: 8 },
};