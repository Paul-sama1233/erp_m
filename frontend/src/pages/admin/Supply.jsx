import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

export default function Supply() {
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState([]);
  const [materials, setMaterials]       = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [refreshKey, setRefreshKey]     = useState(0);

  const [form, setForm] = useState({
    material: '', quantity: '', price_per_unit: '', total_cost: '', comment: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  const fetchAll = async () => {
    try {
      const [t_res, m] = await Promise.all([
        axios.get(`${API}/api/transactions/`, { headers }),
        axios.get(`${API}/api/materials/`, { headers }),
      ]);
      setTransactions(t_res.data.filter(tx => tx.transaction_type === 'in'));
      setMaterials(m.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [refreshKey]);

  // --- ЖЕСТКИЙ КАЛЬКУЛЯТОР СТОИМОСТИ ---
  const handleQtyChange = (val) => {
    const qty = parseFloat(val) || 0;
    const price = parseFloat(form.price_per_unit) || 0;
    setForm(prev => ({
      ...prev,
      quantity: val,
      total_cost: (qty > 0 && price > 0) ? (qty * price).toFixed(2) : ''
    }));
  };

  const handlePriceChange = (val) => {
    const price = parseFloat(val) || 0;
    const qty = parseFloat(form.quantity) || 0;
    setForm(prev => ({
      ...prev,
      price_per_unit: val,
      total_cost: (qty > 0 && price > 0) ? (qty * price).toFixed(2) : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const material = materials.find(m => m.id === parseInt(form.material));

    try {
      await axios.post(`${API}/api/transactions/`, {
        material: form.material,
        quantity: form.quantity,
        price_per_unit: form.price_per_unit,
        total_cost: form.total_cost, // Отправляем посчитанную сумму
        transaction_type: 'in',
        comment: form.comment,
      }, { headers });

      await axios.patch(`${API}/api/materials/${form.material}/`, {
        quantity: parseFloat(material.quantity) + parseFloat(form.quantity),
        price_per_unit: form.price_per_unit
      }, { headers });

      setForm({ material: '', quantity: '', price_per_unit: '', total_cost: '', comment: '' });
      setShowForm(false);
      refresh();
    } catch (err) {
      alert(t('common.error'));
    }
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  // Считаем общую сумму всех поставок в таблице
  const grandTotal = transactions.reduce((sum, tx) => sum + parseFloat(tx.total_cost || 0), 0);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.supply.title')}</h2>
        <button style={s.addBtn} onClick={() => setShowForm(!showForm)}>
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
                onChange={e => {
                  const mId = e.target.value;
                  const selectedMat = materials.find(m => m.id === parseInt(mId));
                  const currentPrice = selectedMat ? selectedMat.price_per_unit : '';
                  const qty = parseFloat(form.quantity) || 0;

                  setForm({
                    ...form,
                    material: mId,
                    price_per_unit: currentPrice,
                    total_cost: (qty > 0 && currentPrice > 0) ? (qty * parseFloat(currentPrice)).toFixed(2) : ''
                  });
                }}>
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
                onChange={e => handleQtyChange(e.target.value)} />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Цена за единицу (сум)</label>
              <input style={s.input} type="number" step="0.01" min="0" required
                placeholder="Цена за ед."
                value={form.price_per_unit}
                onChange={e => handlePriceChange(e.target.value)} />
            </div>

            {/* ПОЛЕ ТОЛЬКО ДЛЯ ЧТЕНИЯ */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Общая стоимость (сум)</label>
              <input
                style={{...s.input, background: '#f1f5f9', fontWeight: 'bold', color: '#0f172a', cursor: 'not-allowed'}}
                type="text"
                readOnly
                placeholder="Считается автоматически..."
                value={form.total_cost ? `${Number(form.total_cost).toLocaleString()} сум` : ''}
              />
            </div>

            <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
              <label style={s.label}>{t('admin.supply.form.comment')}</label>
              <input style={s.input} placeholder={t('admin.supply.form.commentPlaceholder')}
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={s.saveBtn} type="submit">{t('admin.supply.buttons.submit')}</button>
            <button style={s.cancelBtn} type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {/* Информационная панель */}
      {transactions.length > 0 && (
        <div style={s.summaryCard}>
          <div style={s.summaryLabel}>Всего потрачено на закупки:</div>
          <div style={s.summaryNum}>{grandTotal.toLocaleString()} сум</div>
        </div>
      )}

      {/* Таблица истории поставок */}
      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}>{t('admin.supply.table.date')}</th>
            <th style={s.th}>{t('admin.supply.table.material')}</th>
            <th style={s.th}>{t('admin.supply.table.quantity')}</th>
            <th style={s.th}>Цена за ед.</th>
            <th style={s.th}>Общая стоимость</th>
            <th style={s.th}>{t('admin.supply.table.comment')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
                {t('admin.supply.empty')}
              </td>
            </tr>
          )}
          {transactions.map(tx => (
            <tr key={tx.id} style={s.tr}>
              <td style={s.td}>
                {new Date(tx.created_at).toLocaleDateString('ru-RU')}
              </td>
              <td style={s.td}><strong>{tx.material_name}</strong></td>
              <td style={s.td}>
                <span style={s.qtyBadge}>+{tx.quantity}</span>
              </td>
              <td style={s.td}>
                {tx.price_per_unit ? `${Number(tx.price_per_unit).toLocaleString()} сум` : '—'}
              </td>
              <td style={s.td}>
                <strong style={{color: '#16a34a'}}>
                  {tx.total_cost ? `${Number(tx.total_cost).toLocaleString()} сум` : '—'}
                </strong>
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
  page:      { padding: 32, minHeight: '100vh' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:     { margin: 0, fontSize: 24, fontWeight: 700 },
  addBtn:    { background: '#4f46e5', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 10px rgba(79,70,229,0.3)' },

  form:      { background: '#fff', padding: 24, borderRadius: 16, marginBottom: 24, border: '1px solid #f3f4f6', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  formGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  fieldGroup:{ display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 13, fontWeight: 600, color: '#4b5563' },
  input:     { padding: '12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 },
  select:    { padding: '12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 },

  saveBtn:   { background: '#4f46e5', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { background: '#f3f4f6', color: '#374151', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },

  summaryCard: { background: '#fff', padding: '16px 24px', borderRadius: 12, marginBottom: 24, borderLeft: '4px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'inline-block' },
  summaryLabel:{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 4 },
  summaryNum:  { fontSize: 24, fontWeight: 800, color: '#16a34a' },

  table:     { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' },
  thead:     { background: '#f8fafc' },
  th:        { padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  tr:        { borderBottom: '1px solid #f1f5f9' },
  td:        { padding: '14px 16px', fontSize: 14, color: '#334155' },
  qtyBadge:  { background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: 13 },
};