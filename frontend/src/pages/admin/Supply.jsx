import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

export default function Supply() {
  const [transactions, setTransactions] = useState([]);
  const [materials, setMaterials]       = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [refreshKey, setRefreshKey]     = useState(0);

  const [form, setForm] = useState({
    material: '', quantity: '', comment: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  const fetchAll = async () => {
    const [t, m] = await Promise.all([
      axios.get(`${API}/api/transactions/`, { headers }),
      axios.get(`${API}/api/materials/`, { headers }),
    ]);
    // Показываем только поставки (тип 'in')
    setTransactions(t.data.filter(t => t.transaction_type === 'in'));
    setMaterials(m.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const material = materials.find(m => m.id === parseInt(form.material));

    // Создаём транзакцию
    await axios.post(`${API}/api/transactions/`, {
      material: form.material,
      quantity: form.quantity,
      transaction_type: 'in',
      comment: form.comment,
    }, { headers });

    // Увеличиваем остаток на складе
    await axios.patch(`${API}/api/materials/${form.material}/`, {
      quantity: parseFloat(material.quantity) + parseFloat(form.quantity),
    }, { headers });

    setForm({ material: '', quantity: '', comment: '' });
    setShowForm(false);
    refresh();
  };

  if (loading) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Поставки материалов</h2>
        <button style={s.btn} onClick={() => setShowForm(!showForm)}>
          + Новая поставка
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Принять поставку</h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Материал</label>
              <select style={s.select} required
                value={form.material}
                onChange={e => setForm({ ...form, material: e.target.value })}>
                <option value="">— Выберите материал —</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} (остаток: {m.quantity} {m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Количество</label>
              <input style={s.input} type="number" step="0.01" min="0.01" required
                placeholder="Введите количество"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Комментарий (поставщик, накладная)</label>
              <input style={s.input} placeholder="Поставщик Ахмадов, накладная №123"
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={s.btn} type="submit">Принять поставку</button>
            <button style={s.cancelBtn} type="button"
              onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </form>
      )}

      {/* Таблица истории поставок */}
      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}>Дата</th>
            <th style={s.th}>Материал</th>
            <th style={s.th}>Количество</th>
            <th style={s.th}>Комментарий</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
                Поставок пока нет
              </td>
            </tr>
          )}
          {transactions.map(t => (
            <tr key={t.id} style={s.tr}>
              <td style={s.td}>
                {new Date(t.created_at).toLocaleDateString('ru-RU')}
              </td>
              <td style={s.td}>{t.material_name}</td>
              <td style={s.td}>
                <span style={s.qtyBadge}>+{t.quantity}</span>
              </td>
              <td style={s.td}>{t.comment || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  page:      { padding: 32 },
  header:    { display: 'flex', justifyContent: 'space-between',
               alignItems: 'center', marginBottom: 24 },
  title:     { margin: 0, fontSize: 22, fontWeight: 700 },
  btn:       { background: '#4f46e5', color: '#fff', border: 'none',
               padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
               fontWeight: 600, fontSize: 14 },
  cancelBtn: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
               padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
               fontWeight: 600, fontSize: 14 },
  form:      { background: '#f8f8ff', padding: 24, borderRadius: 12,
               marginBottom: 24, border: '1px solid #e0e0f0' },
  formGrid:  { display: 'grid',
               gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  fieldGroup:{ display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 13, fontWeight: 600, color: '#555' },
  input:     { padding: '10px 12px', borderRadius: 8,
               border: '1px solid #ddd', fontSize: 14 },
  select:    { padding: '10px 12px', borderRadius: 8,
               border: '1px solid #ddd', fontSize: 14 },
  table:     { width: '100%', borderCollapse: 'collapse', background: '#fff',
               borderRadius: 12, overflow: 'hidden',
               boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  thead:     { background: '#f0f0f0' },
  th:        { padding: '12px 16px', textAlign: 'left',
               fontWeight: 600, fontSize: 14 },
  tr:        { borderBottom: '1px solid #f0f0f0' },
  td:        { padding: '12px 16px', fontSize: 14 },
  qtyBadge:  { background: '#dcfce7', color: '#16a34a', padding: '4px 12px',
               borderRadius: 20, fontWeight: 600, fontSize: 13 },
};