import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';   // ← Добавлено

const API = 'http://127.0.0.1:8000';

export default function Materials() {
  const { t } = useTranslation();                  // ← Добавлено

  const [materials, setMaterials] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ name: '', unit: '', quantity: 0, price_per_unit: 0, min_quantity: 0 });
  const [loading, setLoading]     = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const emptyForm = { name: '', unit: '', quantity: 0, price_per_unit: 0, min_quantity: 0, specialization: 'any' };

  const fetchMaterials = async () => {
    const res = await axios.get(`${API}/api/materials/`, { headers });
    setMaterials(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/api/materials/`, form, { headers });
    setForm({ name: '', unit: '', quantity: 0, price_per_unit: 0 });
    setShowForm(false);
    fetchMaterials();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.materials.confirm.delete'))) return;
    await axios.delete(`${API}/api/materials/${id}/`, { headers });
    fetchMaterials();
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.materials.title')}</h2>
        <button style={s.btn} onClick={() => setShowForm(!showForm)}>
          {showForm ? t('common.cancel') : t('admin.materials.buttons.add')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <input style={s.input} placeholder={t('admin.materials.form.name')} required
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input style={s.input} placeholder={t('admin.materials.form.unit')} required
            value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
          <input style={s.input} placeholder={t('admin.materials.form.quantity')} type="number" step="0.01"
            value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <input style={s.input} placeholder={t('admin.materials.form.pricePerUnit')} type="number" step="0.01"
            value={form.price_per_unit} onChange={e => setForm({...form, price_per_unit: e.target.value})} />
          <input style={s.input} placeholder={t('admin.materials.form.minQuantity')} type="number" step="0.01"
            value={form.min_quantity} onChange={e => setForm({...form, min_quantity: e.target.value})} />

          <div style={s.fieldGroup}>
            <label style={s.label}>{t('admin.materials.form.specialization')}</label>
            <select style={s.input}
              value={form.specialization}
              onChange={e => setForm({...form, specialization: e.target.value})}>
              <option value="any">{t('admin.materials.specialization.any')}</option>
              <option value="frame">{t('specializations.frame')}</option>
              <option value="upholstery">{t('specializations.upholstery')}</option>
              <option value="foam">{t('specializations.foam')}</option>
              <option value="sewing">{t('specializations.sewing')}</option>
            </select>
          </div>

          <button style={s.btn} type="submit">{t('common.save')}</button>
        </form>
      )}

      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}>{t('admin.materials.table.name')}</th>
            <th style={s.th}>{t('admin.materials.table.unit')}</th>
            <th style={s.th}>{t('admin.materials.table.quantity')}</th>
            <th style={s.th}>{t('admin.materials.table.price')}</th>
            <th style={s.th}>{t('admin.materials.table.actions')}</th>
            <th style={s.th}>{t('admin.materials.table.minQuantity')}</th>
            <th style={s.th}>{t('admin.materials.table.specialization')}</th>
          </tr>
        </thead>
        <tbody>
          {materials.length === 0 && (
            <tr><td colSpan={7} style={{textAlign:'center', padding:20, color:'#888'}}>
              {t('admin.materials.empty')}
            </td></tr>
          )}
          {materials.map(m => (
            <tr key={m.id} style={s.tr}>
              <td style={s.td}>{m.name}</td>
              <td style={s.td}>{m.unit}</td>
              <td style={s.td}>{m.quantity}</td>
              <td style={s.td}>{m.price_per_unit} {t('common.currency')}</td>
              <td style={s.td}>
                <button style={s.delBtn} onClick={() => handleDelete(m.id)}>
                  {t('common.delete')}
                </button>
              </td>
              <td style={s.td}>{m.min_quantity}</td>
              <td style={s.td}>
                {t(`specializations.${m.specialization}`) || m.specialization}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  page:  { padding: '32px' },
  header:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title: { margin:0, fontSize:22, fontWeight:700 },
  btn:   { background:'#4f46e5', color:'#fff', border:'none', padding:'10px 20px',
           borderRadius:8, cursor:'pointer', fontWeight:600 },
  form:  { display:'flex', gap:12, marginBottom:24, flexWrap:'wrap',
           background:'#f8f8ff', padding:20, borderRadius:12 },
  input: { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd',
           fontSize:14, minWidth:160 },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff',
           borderRadius:12, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.07)' },
  thead: { background:'#f0f0f0' },
  th:    { padding:'12px 16px', textAlign:'left', fontWeight:600, fontSize:14 },
  tr:    { borderBottom:'1px solid #f0f0f0' },
  td:    { padding:'12px 16px', fontSize:14 },
  delBtn:{ background:'#fee2e2', color:'#dc2626', border:'none', padding:'6px 14px',
           borderRadius:6, cursor:'pointer', fontWeight:500 },
};