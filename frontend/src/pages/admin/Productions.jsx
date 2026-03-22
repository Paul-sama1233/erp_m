import { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [productions, setProductions] = useState([]);
  const [products, setProducts]       = useState([]);
  const [persons, setPersons]         = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [expanded, setExpanded]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [completing, setCompleting]   = useState(null);
  const [editStage, setEditStage]     = useState(null);

  const [form, setForm] = useState({ product: '', person: '' });

  // Форма добавления этапа
  const [stageForm, setStageForm] = useState({
    production: null,
    stage_type: '',
    assigned_worker: '',
  });
  const [showStageForm, setShowStageForm] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    const [prod, prods, pers] = await Promise.all([
      axios.get(`${API}/api/productions/`, { headers }),
      axios.get(`${API}/api/products/`, { headers }),
      axios.get(`${API}/api/persons/`, { headers }),
    ]);
    setProductions(prod.data);
    setProducts(prods.data);
    setPersons(pers.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Запуск производства
  const handleCreate = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/api/productions/`, form, { headers });
    setForm({ product: '', person: '' });
    setShowForm(false);
    fetchAll();
  };

  // Завершение производства (списание материалов)
  const handleComplete = async (id) => {
    if (!confirm('Завершить производство? Материалы будут списаны со склада.')) return;
    setCompleting(id);
    try {
      await axios.post(`${API}/api/productions/${id}/complete/`, {}, { headers });
      alert('✅ Производство завершено, материалы списаны!');
      fetchAll();
    } catch (err) {
      const details = err.response?.data?.details;
      if (details) {
        alert('❌ Недостаточно материалов:\n' + details.join('\n'));
      } else {
        alert('Ошибка при завершении производства');
      }
    } finally {
      setCompleting(null);
    }
  };

  // Добавление этапа
  const handleAddStage = async (e, productionId) => {
    e.preventDefault();
    await axios.post(`${API}/api/production-stages/`, {
      production: productionId,
      stage_type: stageForm.stage_type,
      assigned_worker: stageForm.assigned_worker,
    }, { headers });
    setStageForm({ production: null, stage_type: '', assigned_worker: '' });
    setShowStageForm(null);
    fetchAll();
  };
  const handleDeleteStage = async (stageId) => {
      if (!confirm('Удалить этот этап?')) return;
      await axios.delete(`${API}/api/production-stages/${stageId}/`, { headers });
      fetchAll();
  };

    //изменение ответственного
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


  // Удаление производства
  const handleDelete = async (id) => {
    if (!confirm('Удалить производство?')) return;
    await axios.delete(`${API}/api/productions/${id}/`, { headers });
    fetchAll();
  };

  if (loading) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Производство</h2>
        <button style={s.btn} onClick={() => setShowForm(!showForm)}>
          + Запустить производство
        </button>
      </div>

      {/* Форма запуска производства */}
      {showForm && (
        <form onSubmit={handleCreate} style={s.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Новое производство</h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Изделие</label>
              <select style={s.select} required
                value={form.product}
                onChange={e => setForm({ ...form, product: e.target.value })}>
                <option value="">— Выберите изделие —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Number(p.price).toLocaleString()} сум
                  </option>
                ))}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Ответственный сотрудник</label>
              <select style={s.select} required
                value={form.person}
                onChange={e => setForm({ ...form, person: e.target.value })}>
                <option value="">— Выберите сотрудника —</option>
                {persons.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={s.btn} type="submit">Запустить</button>
            <button style={s.cancelBtn} type="button"
              onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </form>
      )}

      {/* Список производств */}
      <div style={s.list}>
        {productions.length === 0 && (
          <div style={s.empty}>Производств пока нет</div>
        )}
        {productions.map(prod => (
          <div key={prod.id} style={s.card}>

            {/* Заголовок карточки */}
            <div style={s.cardHeader}>
              <div>
                <span style={s.productName}>{prod.product_name}</span>
                <span style={s.personName}>👤 {prod.person_name}</span>
                <span style={s.date}>
                  {new Date(prod.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={s.expandBtn}
                  onClick={() => setExpanded(expanded === prod.id ? null : prod.id)}>
                  {expanded === prod.id ? '▲ Скрыть' : '▼ Этапы'} ({prod.stages.length})
                </button>
                <button
                  style={{ ...s.completeBtn, opacity: completing === prod.id ? 0.6 : 1 }}
                  onClick={() => handleComplete(prod.id)}
                  disabled={completing === prod.id}>
                  {completing === prod.id ? 'Завершение...' : '✅ Завершить'}
                </button>
                <button style={s.delBtn} onClick={() => handleDelete(prod.id)}>
                  Удалить
                </button>
              </div>
            </div>

            {/* Этапы производства */}
            {expanded === prod.id && (
              <div style={s.stagesBlock}>
                <table style={s.table}>
                  <thead>
                    <tr style={{ background: '#f9f9f9' }}>
                      <th style={s.th}>Этап</th>
                      <th style={s.th}>Работник</th>
                      <th style={s.th}>Статус</th>
                       <th style={s.th}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
              {prod.stages.map(stage => (
                      <tr key={stage.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={s.td}>{STAGE_LABELS[stage.stage_type]}</td>
                        <td style={s.td}>
                          {editStage?.id === stage.id ? (
                            <form onSubmit={handleUpdateStage} style={{ display: 'flex', gap: 8 }}>
                              <select style={s.select} required
                                value={editStage.assigned_worker}
                                onChange={e => setEditStage({ ...editStage, assigned_worker: e.target.value })}>
                                <option value="">— Работник —</option>
                                {persons
                                  .filter(p => p.specialization === stage.stage_type)
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
                            stage.assigned_worker_name
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
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button style={s.editBtn}
                              onClick={() => setEditStage({
                                id: stage.id,
                                stage_type: stage.stage_type,
                                assigned_worker: stage.assigned_worker,
                              })}>
                              Изменить
                            </button>
                            <button style={s.delBtn} onClick={() => handleDeleteStage(stage.id)}>
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>


                {/* Форма добавления этапа */}
            {showStageForm === prod.id ? (
              <form onSubmit={(e) => handleAddStage(e, prod.id)} style={s.stageForm}>
                <select style={s.select} required
                  value={stageForm.stage_type}
                  onChange={e => setStageForm({ ...stageForm, stage_type: e.target.value, assigned_worker: '' })}>
                  <option value="">— Этап —</option>
                  {Object.entries(STAGE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>

                <select style={s.select} required
                  value={stageForm.assigned_worker}
                  onChange={e => setStageForm({ ...stageForm, assigned_worker: e.target.value })}>
                  <option value="">— Работник —</option>
                  {persons
                    .filter(p => !stageForm.stage_type || p.specialization === stageForm.stage_type)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))
                  }
                </select>

                <button style={s.btn} type="submit">Добавить</button>
                <button style={s.cancelBtn} type="button"
                  onClick={() => setShowStageForm(null)}>Отмена</button>
              </form>
            ) : (
                  <button style={{ ...s.expandBtn, marginTop: 12 }}
                    onClick={() => setShowStageForm(prod.id)}>
                    + Назначить этап
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page:        { padding: 32 },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:       { margin: 0, fontSize: 22, fontWeight: 700 },
  btn:         { background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px',
                 borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  cancelBtn:   { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                 padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  completeBtn: { background: '#dcfce7', color: '#16a34a', border: 'none', padding: '8px 16px',
                 borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  form:        { background: '#f8f8ff', padding: 24, borderRadius: 12,
                 marginBottom: 24, border: '1px solid #e0e0f0' },
  formGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 13, fontWeight: 600, color: '#555' },
  select:      { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  list:        { display: 'flex', flexDirection: 'column', gap: 12 },
  empty:       { textAlign: 'center', padding: 40, color: '#aaa', fontSize: 16 },
  card:        { background: '#fff', borderRadius: 12, overflow: 'hidden',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                 padding: '16px 20px' },
  productName: { fontWeight: 700, fontSize: 16, marginRight: 12 },
  personName:  { color: '#666', fontSize: 14, marginRight: 12 },
  date:        { color: '#aaa', fontSize: 13 },
  expandBtn:   { background: '#f0f0ff', color: '#4f46e5', border: 'none', padding: '6px 14px',
                 borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 },
  delBtn:      { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px',
                 borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  stagesBlock: { borderTop: '1px solid #f0f0f0', padding: '16px 20px', background: '#fafafa' },
  table:       { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th:          { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13 },
  td:          { padding: '10px 12px', fontSize: 14 },
  badge:       { padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  stageForm:   { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                 paddingTop: 12, borderTop: '1px dashed #e0e0e0', marginTop: 8 },
  editBtn:     { background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 14px',
                 borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
};