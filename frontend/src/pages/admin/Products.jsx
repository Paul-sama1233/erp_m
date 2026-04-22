import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';
const emptyForm = { name: '', price: '' };

export default function Products() {
  const { t } = useTranslation();

  const [products, setProducts]       = useState([]);
  const [materials, setMaterials]     = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [editingId, setEditingId]     = useState(null);
  const [expanded, setExpanded]       = useState(null); // ID раскрытого изделия
  const [loading, setLoading]         = useState(true);

  // Состояния для форм внутри карточки
  const [pmForm, setPmForm]           = useState({ material: '', quantity: '', stage_template: '' });
  const [stageForm, setStageForm]     = useState({ stage_type: '', order: '' });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    const [p, m] = await Promise.all([
      axios.get(`${API}/api/products/`, { headers }),
      axios.get(`${API}/api/materials/`, { headers }),
    ]);
    setProducts(p.data);
    setMaterials(m.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // --- УПРАВЛЕНИЕ ИЗДЕЛИЕМ ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`${API}/api/products/${editingId}/`, form, { headers });
    } else {
      await axios.post(`${API}/api/products/`, form, { headers });
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    fetchAll();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.products.confirm.delete'))) return;
    try {
      await axios.delete(`${API}/api/products/${id}/`, { headers });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  // --- УПРАВЛЕНИЕ ЭТАПАМИ (ТЕХКАРТА) ---
  const handleAddStage = async (e, productId) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/product-stage-templates/`, {
        product: productId,
        stage_type: stageForm.stage_type,
        order: stageForm.order || 0,
      }, { headers });
      setStageForm({ stage_type: '', order: '' });
      fetchAll();
    } catch (err) {
      alert(t('common.error'));
    }
  };

  const handleRemoveStage = async (stageId) => {
    if (!confirm("Удалить этап? Привязанные к нему материалы останутся без этапа.")) return;
    await axios.delete(`${API}/api/product-stage-templates/${stageId}/`, { headers });
    fetchAll();
  };

  // --- УПРАВЛЕНИЕ МАТЕРИАЛАМИ ---
  const handleAddMaterial = async (e, productId) => {
    e.preventDefault();
    if (!productId) return alert(t('admin.products.alert.noProductId'));

    try {
      await axios.post(`${API}/api/product-materials/`, {
        product: productId,
        material: parseInt(pmForm.material),
        quantity: pmForm.quantity,
        stage_template: pmForm.stage_template ? parseInt(pmForm.stage_template) : null,
      }, { headers });
      setPmForm({ material: '', quantity: '', stage_template: '' });
      fetchAll();
    } catch (err) {
      alert(t('common.error'));
    }
  };

  const handleRemoveMaterial = async (pmId) => {
    try {
      await axios.delete(`${API}/api/product-materials/${pmId}/`, { headers });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.products.title')}</h2>
        <button style={s.btn} onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}>
          {t('admin.products.buttons.add')}
        </button>
      </div>

      {/* Форма Изделия */}
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
            {editingId ? t('admin.products.form.editTitle') : t('admin.products.form.newTitle')}
          </h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.products.form.name')}</label>
              <input style={s.input} placeholder={t('admin.products.form.namePlaceholder')} required
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.products.form.price')}</label>
              <input style={s.input} type="number" step="0.01" min="0" required
                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button style={s.btn} type="submit">{editingId ? t('common.save') : t('admin.products.buttons.create')}</button>
            <button style={s.cancelBtn} type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {/* Список Изделий */}
      <div style={s.list}>
        {products.length === 0 && <div style={s.empty}>{t('admin.products.empty')}</div>}

        {products.map(p => (
          <div key={p.id} style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <span style={s.productName}>{p.name}</span>
                <span style={s.productPrice}>{Number(p.price).toLocaleString()} {t('common.currency')}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.expandBtn} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                  {expanded === p.id ? t('common.hide') : `▼ Настройки (${p.stage_templates?.length || 0} этапов, ${p.materials.length} мат.)`}
                </button>
                <button style={s.editBtn} onClick={() => { setForm({ name: p.name, price: p.price }); setEditingId(p.id); setShowForm(true); }}>
                  {t('common.edit')}
                </button>
                <button style={s.delBtn} onClick={() => handleDelete(p.id)}>{t('common.delete')}</button>
              </div>
            </div>

            {/* Внутренности раскрытого изделия */}
            {expanded === p.id && (
              <div style={s.expandedBlock}>

                {/* 1. БЛОК ЭТАПОВ (ТЕХКАРТА) */}
                <div style={s.innerSection}>
                  <h4 style={s.sectionTitle}>🛠 Этапы сборки (Техкарта)</h4>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Порядок</th>
                        <th style={s.th}>Этап</th>
                        <th style={s.th}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.stage_templates?.length === 0 && (
                        <tr><td colSpan={3} style={s.tdEmpty}>Этапы не настроены (по умолчанию создастся Каркас)</td></tr>
                      )}
                      {p.stage_templates?.map(st => (
                        <tr key={st.id} style={s.tr}>
                          <td style={s.td}>#{st.order}</td>
                          <td style={s.td}><strong>{st.stage_name}</strong></td>
                          <td style={s.td}>
                            <button style={s.delBtn} onClick={() => handleRemoveStage(st.id)}>{t('common.delete')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Добавить этап */}
                  <form onSubmit={(e) => handleAddStage(e, p.id)} style={s.inlineForm}>
                    <select style={s.select} required value={stageForm.stage_type} onChange={e => setStageForm({ ...stageForm, stage_type: e.target.value })}>
                      <option value="">— Выберите этап —</option>
                      <option value="frame">{t('stages.frame')}</option>
                      <option value="springs">{t('stages.springs')}</option>
                      <option value="sewing">{t('stages.sewing')}</option>
                      <option value="foam">{t('stages.foam')}</option>
                      <option value="upholstery">{t('stages.upholstery')}</option>
                    </select>
                    <input style={{ ...s.input, width: 100 }} type="number" min="0" placeholder="Порядок" required
                      value={stageForm.order} onChange={e => setStageForm({ ...stageForm, order: e.target.value })} />
                    <button style={s.btn} type="submit">+ Добавить этап</button>
                  </form>
                </div>

                {/* 2. БЛОК МАТЕРИАЛОВ (РЕСУРСЫ) */}
                <div style={s.innerSection}>
                  <h4 style={s.sectionTitle}>📦 Материалы изделия</h4>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Этап использования</th>
                        <th style={s.th}>{t('admin.products.table.material')}</th>
                        <th style={s.th}>{t('admin.products.table.quantity')}</th>
                        <th style={s.th}>{t('admin.products.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.materials.length === 0 && (
                        <tr><td colSpan={4} style={s.tdEmpty}>{t('admin.products.table.noMaterials')}</td></tr>
                      )}
                      {p.materials.map(pm => (
                        <tr key={pm.id} style={s.tr}>
                          <td style={s.td}>
                            <span style={s.stageBadge}>{pm.stage_name || 'Общий (Без этапа)'}</span>
                          </td>
                          <td style={s.td}>{pm.material_name}</td>
                          <td style={s.td}>{pm.quantity} {pm.material_unit}</td>
                          <td style={s.td}>
                            <button style={s.delBtn} onClick={() => handleRemoveMaterial(pm.id)}>
                              {t('admin.products.buttons.remove')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Добавить материал */}
                  <form onSubmit={(e) => handleAddMaterial(e, p.id)} style={s.inlineForm}>
                    <select style={s.select} required value={pmForm.material} onChange={e => setPmForm({ ...pmForm, material: e.target.value })}>
                      <option value="">{t('admin.products.form.selectMaterial')}</option>
                      {materials.filter(m => !p.materials.find(pm => pm.material === m.id)).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>

                    <select style={s.select} value={pmForm.stage_template} onChange={e => setPmForm({ ...pmForm, stage_template: e.target.value })}>
                      <option value="">— Для какого этапа? —</option>
                      {p.stage_templates?.map(st => (
                        <option key={st.id} value={st.id}>{st.stage_name}</option>
                      ))}
                    </select>

                    <input style={{ ...s.input, width: 120 }} type="number" step="0.01" min="0.01" placeholder={t('common.quantity')} required
                      value={pmForm.quantity} onChange={e => setPmForm({ ...pmForm, quantity: e.target.value })} />
                    <button style={s.btn} type="submit">+ Привязать материал</button>
                  </form>
                </div>

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page:         { padding: 32 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:        { margin: 0, fontSize: 22, fontWeight: 700 },
  btn:          { background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  cancelBtn:    { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  form:         { background: '#f8f8ff', padding: 24, borderRadius: 12, marginBottom: 24, border: '1px solid #e0e0f0' },
  formGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  fieldGroup:   { display: 'flex', flexDirection: 'column', gap: 6 },
  label:        { fontSize: 13, fontWeight: 600, color: '#555' },
  input:        { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  select:       { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 180 },
  list:         { display: 'flex', flexDirection: 'column', gap: 12 },
  empty:        { textAlign: 'center', padding: 40, color: '#aaa', fontSize: 16 },
  card:         { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' },
  productName:  { fontWeight: 700, fontSize: 16, marginRight: 16 },
  productPrice: { color: '#4f46e5', fontWeight: 600, fontSize: 15 },
  expandBtn:    { background: '#f0f0ff', color: '#4f46e5', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 },
  editBtn:      { background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  delBtn:       { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  expandedBlock:{ borderTop: '1px solid #f0f0f0', background: '#fafafa', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 32 },
  innerSection: { background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  sectionTitle: { margin: '0 0 16px 0', fontSize: 15, color: '#111827' },
  table:        { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th:           { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #f0f0f0', color: '#4b5563' },
  tr:           { borderBottom: '1px solid #f0f0f0' },
  td:           { padding: '10px 12px', fontSize: 14 },
  tdEmpty:      { padding: 20, color: '#9ca3af', textAlign: 'center', fontSize: 14 },
  inlineForm:   { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingTop: 12, borderTop: '1px dashed #e0e0e0' },
  stageBadge:   { background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }
};