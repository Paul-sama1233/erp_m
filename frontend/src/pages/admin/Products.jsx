import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';
const emptyForm = { name: '', price: '' };

export default function Products() {
  const [products, setProducts]       = useState([]);
  const [materials, setMaterials]     = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [editingId, setEditingId]     = useState(null);
  const [expanded, setExpanded]       = useState(null); // какое изделие раскрыто
  const [pmForm, setPmForm]           = useState({ material: '', quantity: '' });
  const [loading, setLoading]         = useState(true);

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

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({ name: p.name, price: p.price });
    setEditingId(p.id);
    setShowForm(true);
  };

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
    if (!confirm('Удалить изделие? Все связанные материалы тоже удалятся.')) return;
    await axios.delete(`${API}/api/products/${id}/`, { headers });
    fetchAll();
  };

  // Добавить материал к изделию
const handleAddMaterial = async (e, productId) => {
  e.preventDefault();
  if (!productId) {
    alert('Ошибка: ID изделия не определён');
    return;
  }
  await axios.post(`${API}/api/product-materials/`, {
    product: productId,
    material: parseInt(pmForm.material),
    quantity: pmForm.quantity,
  }, { headers });
  setPmForm({ material: '', quantity: '' });
  fetchAll();
};

  // Удалить материал из изделия
  const handleRemoveMaterial = async (pmId) => {
    await axios.delete(`${API}/api/product-materials/${pmId}/`, { headers });
    fetchAll();
  };

  if (loading) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Изделия</h2>
        <button style={s.btn} onClick={openCreate}>+ Добавить изделие</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
            {editingId ? 'Редактировать изделие' : 'Новое изделие'}
          </h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Название изделия</label>
              <input style={s.input} placeholder="Диван Милан, Кухня Классик..." required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Цена продажи (сум)</label>
              <input style={s.input} type="number" step="0.01" min="0" required
                placeholder="3500000"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button style={s.btn} type="submit">
              {editingId ? 'Сохранить' : 'Создать изделие'}
            </button>
            <button style={s.cancelBtn} type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}>
              Отмена
            </button>
          </div>
        </form>
      )}

      <div style={s.list}>
        {products.length === 0 && (
          <div style={s.empty}>Изделий пока нет</div>
        )}
        {products.map(p => (
          <div key={p.id} style={s.card}>

            {/* Заголовок карточки */}
            <div style={s.cardHeader}>
              <div>
                <span style={s.productName}>{p.name}</span>
                <span style={s.productPrice}>
                  {Number(p.price).toLocaleString()} сум
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.expandBtn}
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                  {expanded === p.id ? '▲ Скрыть' : '▼ Материалы'} ({p.materials.length})
                </button>
                <button style={s.editBtn} onClick={() => openEdit(p)}>Изменить</button>
                <button style={s.delBtn} onClick={() => handleDelete(p.id)}>Удалить</button>
              </div>
            </div>

            {/* Раскрытый список материалов */}
            {expanded === p.id && (
              <div style={s.materialsBlock}>
                <table style={s.pmTable}>
                  <thead>
                    <tr style={{ background: '#f9f9f9' }}>
                      <th style={s.th}>Материал</th>
                      <th style={s.th}>Кол-во на 1 изделие</th>
                      <th style={s.th}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.materials.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: 12, color: '#aaa', textAlign: 'center' }}>
                          Материалы не добавлены
                        </td>
                      </tr>
                    )}
                    {p.materials.map(pm => (
                      <tr key={pm.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={s.td}>{pm.material_name}</td>
                        <td style={s.td}>
                          {pm.quantity} {pm.material_unit}
                        </td>
                        <td style={s.td}>
                          <button style={s.delBtn}
                            onClick={() => handleRemoveMaterial(pm.id)}>
                            Убрать
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Форма добавления материала */}
                <form onSubmit={(e) => handleAddMaterial(e, p.id)} style={s.pmForm}>
                  <select style={s.select} required
                    value={pmForm.material}
                    onChange={e => setPmForm({ ...pmForm, material: e.target.value })}>
                    <option value="">— Выберите материал —</option>
                    {materials
                      .filter(m => !p.materials.find(pm => pm.material === m.id))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                  </select>
                  <input style={{ ...s.input, width: 140 }}
                    type="number" step="0.01" min="0.01"
                    placeholder="Количество" required
                    value={pmForm.quantity}
                    onChange={e => setPmForm({ ...pmForm, quantity: e.target.value })} />
                  <button style={s.btn} type="submit">+ Добавить</button>
                </form>
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
  btn:          { background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px',
                  borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  cancelBtn:    { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                  padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  form:         { background: '#f8f8ff', padding: 24, borderRadius: 12,
                  marginBottom: 24, border: '1px solid #e0e0f0' },
  formGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  fieldGroup:   { display: 'flex', flexDirection: 'column', gap: 6 },
  label:        { fontSize: 13, fontWeight: 600, color: '#555' },
  input:        { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  select:       { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd',
                  fontSize: 14, minWidth: 220 },
  list:         { display: 'flex', flexDirection: 'column', gap: 12 },
  empty:        { textAlign: 'center', padding: 40, color: '#aaa', fontSize: 16 },
  card:         { background: '#fff', borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 20px' },
  productName:  { fontWeight: 700, fontSize: 16, marginRight: 16 },
  productPrice: { color: '#4f46e5', fontWeight: 600, fontSize: 15 },
  expandBtn:    { background: '#f0f0ff', color: '#4f46e5', border: 'none', padding: '6px 14px',
                  borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 },
  editBtn:      { background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 14px',
                  borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  delBtn:       { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px',
                  borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  materialsBlock: { borderTop: '1px solid #f0f0f0', padding: '16px 20px',
                    background: '#fafafa' },
  pmTable:      { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th:           { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13 },
  td:           { padding: '10px 12px', fontSize: 14 },
  pmForm:       { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                  paddingTop: 12, borderTop: '1px dashed #e0e0e0' },
};