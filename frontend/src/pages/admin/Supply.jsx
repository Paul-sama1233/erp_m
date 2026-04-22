import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next'; // ← Добавлен импорт

const API = 'http://127.0.0.1:8000';

export default function Supply() {
  const { t } = useTranslation(); // ← Инициализация хука

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
    const [t_res, m] = await Promise.all([
      axios.get(`${API}/api/transactions/`, { headers }),
      axios.get(`${API}/api/materials/`, { headers }),
    ]);
    // Показываем только поставки (тип 'in')
    setTransactions(t_res.data.filter(tx => tx.transaction_type === 'in'));
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

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.supply.title')}</h2>
        <button style={s.btn} onClick={() => setShowForm(!showForm)}>
          {t('admin.supply.buttons.new')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{t('admin.supply.form.title')}</h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.supply.form.material')}</label>
              <select style={s.select} required
                value={form.material}
                onChange={e => setForm({ ...form, material: e.target.value })}>
                <option value="">{t('admin.supply.form.selectMaterial')}</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {t('admin.supply.form.stock', { quantity: m.quantity, unit: m.unit })}
                  </option>
                ))}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.supply.form.quantity')}</label>
              <input style={s.input} type="number" step="0.01" min="0.01" required
                placeholder={t('admin.supply.form.quantityPlaceholder')}
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.supply.form.comment')}</label>
              <input style={s.input} placeholder={t('admin.supply.form.commentPlaceholder')}
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={s.btn} type="submit">{t('admin.supply.buttons.submit')}</button>
            <button style={s.cancelBtn} type="button"
              onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {/* Таблица истории поставок */}
      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}>{t('admin.supply.table.date')}</th>
            <th style={s.th}>{t('admin.supply.table.material')}</th>
            <th style={s.th}>{t('admin.supply.table.quantity')}</th>
            <th style={s.th}>{t('admin.supply.table.comment')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
                {t('admin.supply.empty')}
              </td>
            </tr>
          )}
          {transactions.map(tx => (
            <tr key={tx.id} style={s.tr}>
              <td style={s.td}>
                {new Date(tx.created_at).toLocaleDateString('ru-RU')}
              </td>
              <td style={s.td}>{tx.material_name}</td>
              <td style={s.td}>
                <span style={s.qtyBadge}>+{tx.quantity}</span>
              </td>
              <td style={s.td}>{tx.comment || '—'}</td>
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