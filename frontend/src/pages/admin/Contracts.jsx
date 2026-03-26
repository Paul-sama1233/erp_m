import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';
const emptyForm = { client_name: '', phone: '', address: '' };

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [products, setProducts]   = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [itemForm, setItemForm] = useState({
    product: '', quantity: 1, price: '', production_date: ''
  });
  const [showItemForm, setShowItemForm] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  const fetchAll = async () => {
    const [c, p] = await Promise.all([
      axios.get(`${API}/api/contracts/`, { headers }),
      axios.get(`${API}/api/products/`, { headers }),
    ]);
    setContracts(c.data);
    setProducts(p.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`${API}/api/contracts/${editingId}/`, form, { headers });
    } else {
      await axios.post(`${API}/api/contracts/`, form, { headers });
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    refresh();
  };
  const handleStartProduction = async (item, contractId) => {
  // Помечаем позицию как "в производстве"
  await axios.patch(`${API}/api/contract-products/${item.id}/`,
    { status: 'in_progress' },
    { headers }
  );
  // Создаём производство автоматически
  await axios.post(`${API}/api/productions/`, {
    product: item.product,
    contract: contractId,
  }, { headers });
  refresh();
  alert(`✅ Производство для "${item.product_name}" запущено!`);
 };

  const handleDelete = async (id) => {
    if (!confirm('Удалить договор?')) return;
    await axios.delete(`${API}/api/contracts/${id}/`, { headers });
    refresh();
  };

  const handleAddItem = async (e, contractId) => {
    e.preventDefault();
    await axios.post(`${API}/api/contract-products/`, {
      contract: contractId,
      product: itemForm.product,
      quantity: itemForm.quantity,
      price: itemForm.price,
      production_date: itemForm.production_date || null,
    }, { headers });
    setItemForm({ product: '', quantity: 1, price: '', production_date: '' });
    setShowItemForm(null);
    refresh();
  };

  const handleRemoveItem = async (itemId) => {
    if (!confirm('Удалить позицию?')) return;
    await axios.delete(`${API}/api/contract-products/${itemId}/`, { headers });
    refresh();
  };

  const openEdit = (c) => {
    setForm({ client_name: c.client_name, phone: c.phone, address: c.address });
    setEditingId(c.id);
    setShowForm(true);
  };

  if (loading) return <p style={{ padding: 40 }}>Загрузка...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Договоры</h2>
        <button style={s.btn} onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
          + Новый договор
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
            {editingId ? 'Редактировать договор' : 'Новый договор'}
          </h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>ФИО клиента</label>
              <input style={s.input} required placeholder="Иванов Иван Иванович"
                value={form.client_name}
                onChange={e => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Телефон</label>
              <input style={s.input} placeholder="+998 90 123 45 67"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Адрес</label>
              <input style={s.input} placeholder="г. Ташкент, ул. Навои 1"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={s.btn} type="submit">
              {editingId ? 'Сохранить' : 'Создать договор'}
            </button>
            <button style={s.cancelBtn} type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}>
              Отмена
            </button>
          </div>
        </form>
      )}

      <div style={s.list}>
        {contracts.length === 0 && (
          <div style={s.empty}>Договоров пока нет</div>
        )}
        {contracts.map(c => (
          <div key={c.id} style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <span style={s.clientName}>{c.client_name}</span>
                {c.phone && <span style={s.meta}>📞 {c.phone}</span>}
                {c.address && <span style={s.meta}>📍 {c.address}</span>}
                <span style={s.date}>
                  {new Date(c.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.expandBtn}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  {expanded === c.id ? '▲ Скрыть' : '▼ Позиции'} ({c.items.length})
                </button>
                <button style={s.editBtn} onClick={() => openEdit(c)}>
                  Изменить
                </button>
                <button style={s.delBtn} onClick={() => handleDelete(c.id)}>
                  Удалить
                </button>
              </div>
            </div>

            {expanded === c.id && (
              <div style={s.itemsBlock}>
                <table style={s.table}>
                  <thead>
                    <tr style={{ background: '#f9f9f9' }}>
                      <th style={s.th}>Изделие</th>
                      <th style={s.th}>Кол-во</th>
                      <th style={s.th}>Цена</th>
                      <th style={s.th}>Дата производства</th>
                      <th style={s.th}>Статус</th>
                      <th style={s.th}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.items.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 12, color: '#aaa', textAlign: 'center' }}>
                          Позиций нет
                        </td>
                      </tr>
                    )}
            {c.items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={s.td}>{item.product_name}</td>
                <td style={s.td}>{item.quantity} шт.</td>
                <td style={s.td}>{Number(item.price).toLocaleString()} сум</td>
                <td style={s.td}>
                  {item.production_date
                    ? new Date(item.production_date).toLocaleDateString('ru-RU')
                    : '—'}
                </td>
                <td style={s.td}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12,
                    background: item.status === 'completed'  ? '#dcfce7' :
                                item.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
                    color:      item.status === 'completed'  ? '#16a34a' :
                                item.status === 'in_progress' ? '#1d4ed8' : '#888',
                  }}>
                    {item.status === 'completed'  ? '✅ Выполнено'      :
                     item.status === 'in_progress' ? '🔨 В производстве' : '⏳ Ожидает'}
                  </span>
                </td>
                <td style={s.td}>
                  {item.status === 'pending' && (
                    <button style={s.startBtn} onClick={() => handleStartProduction(item, c.id)}>
                      ▶ В производство
                    </button>
                  )}
                  <button style={s.delBtn} onClick={() => handleRemoveItem(item.id)}>
                    Удалить
                  </button>
                </td>
              </tr>
                    ))}
                  </tbody>
                </table>

                {showItemForm === c.id ? (
                  <form onSubmit={(e) => handleAddItem(e, c.id)} style={s.itemForm}>
                    <select style={s.select} required
                      value={itemForm.product}
                      onChange={e => setItemForm({ ...itemForm, product: e.target.value })}>
                      <option value="">— Изделие —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input style={{ ...s.input, width: 80 }}
                      type="number" min="1" placeholder="Кол-во"
                      value={itemForm.quantity}
                      onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} />
                    <input style={{ ...s.input, width: 140 }}
                      type="number" placeholder="Цена (сум)" required
                      value={itemForm.price}
                      onChange={e => setItemForm({ ...itemForm, price: e.target.value })} />
                    <input style={{ ...s.input, width: 160 }}
                      type="date"
                      value={itemForm.production_date}
                      onChange={e => setItemForm({ ...itemForm, production_date: e.target.value })} />
                    <button style={s.btn} type="submit">+ Добавить</button>
                    <button style={s.cancelBtn} type="button"
                      onClick={() => setShowItemForm(null)}>Отмена</button>
                  </form>
                ) : (
                  <button style={{ ...s.expandBtn, marginTop: 12 }}
                    onClick={() => setShowItemForm(c.id)}>
                    + Добавить изделие
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
  page:       { padding: 32 },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:      { margin: 0, fontSize: 22, fontWeight: 700 },
  btn:        { background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px',
                borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  cancelBtn:  { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  editBtn:    { background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 14px',
                borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  delBtn:     { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px',
                borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  expandBtn:  { background: '#f0f0ff', color: '#4f46e5', border: 'none', padding: '6px 14px',
                borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 },
  form:       { background: '#f8f8ff', padding: 24, borderRadius: 12,
                marginBottom: 24, border: '1px solid #e0e0f0' },
  formGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label:      { fontSize: 13, fontWeight: 600, color: '#555' },
  input:      { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  select:     { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 200 },
  list:       { display: 'flex', flexDirection: 'column', gap: 12 },
  empty:      { textAlign: 'center', padding: 40, color: '#aaa', fontSize: 16 },
  card:       { background: '#fff', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px' },
  clientName: { fontWeight: 700, fontSize: 16, marginRight: 12 },
  meta:       { color: '#666', fontSize: 13, marginRight: 12 },
  date:       { color: '#aaa', fontSize: 12 },
  itemsBlock: { borderTop: '1px solid #f0f0f0', padding: '16px 20px', background: '#fafafa' },
  table:      { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th:         { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13 },
  td:         { padding: '10px 12px', fontSize: 14 },
  itemForm:   { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                paddingTop: 12, borderTop: '1px dashed #e0e0e0', marginTop: 8 },
  startBtn:   { background: '#dbeafe', color: '#1d4ed8', border: 'none',
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                fontWeight: 500, marginRight: 6 },
};