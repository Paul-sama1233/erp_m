import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ name: '', unit: '', quantity: 0, price_per_unit: 0 });
  const [loading, setLoading]     = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

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
    if (!confirm('Удалить материал?')) return;
    await axios.delete(`${API}/api/materials/${id}/`, { headers });
    fetchMaterials();
  };

  if (loading) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Материалы на складе</h2>
        <button style={s.btn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Добавить материал'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <input style={s.input} placeholder="Название" required
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input style={s.input} placeholder="Единица (кг, м², шт)" required
            value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
          <input style={s.input} placeholder="Количество" type="number" step="0.01"
            value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <input style={s.input} placeholder="Цена за единицу" type="number" step="0.01"
            value={form.price_per_unit} onChange={e => setForm({...form, price_per_unit: e.target.value})} />
          <button style={s.btn} type="submit">Сохранить</button>
        </form>
      )}

      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}>Название</th>
            <th style={s.th}>Единица</th>
            <th style={s.th}>Количество</th>
            <th style={s.th}>Цена за ед.</th>
            <th style={s.th}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {materials.length === 0 && (
            <tr><td colSpan={5} style={{textAlign:'center', padding:20, color:'#888'}}>
              Материалов пока нет
            </td></tr>
          )}
          {materials.map(m => (
            <tr key={m.id} style={s.tr}>
              <td style={s.td}>{m.name}</td>
              <td style={s.td}>{m.unit}</td>
              <td style={s.td}>{m.quantity}</td>
              <td style={s.td}>{m.price_per_unit} сум</td>
              <td style={s.td}>
                <button style={s.delBtn} onClick={() => handleDelete(m.id)}>Удалить</button>
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