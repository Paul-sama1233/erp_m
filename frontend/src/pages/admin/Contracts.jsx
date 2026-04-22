import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';
const emptyForm = { client_name: '', phone: '', address: '' };

export default function Contracts() {
  const { t, i18n } = useTranslation();

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

  const [addressCheck, setAddressCheck] = useState({
    loading: false,
    result: null,
    error: null
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  // Принудительное обновление при смене языка
  useEffect(() => {
  }, [i18n.language]);

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

  const checkAddress = async () => {
    const address = form.address.trim();
    if (!address) {
      setAddressCheck({
        loading: false,
        result: null,
        error: t('admin.contracts.address.errorEmpty')
      });
      return;
    }

    setAddressCheck({ loading: true, result: null, error: null });

    try {
      const res = await axios.get(`${API}/api/contracts/validate-address/`, {
        headers,
        params: { q: address }
      });

      setAddressCheck({
        loading: false,
        result: res.data,
        error: null
      });
    } catch (err) {
      setAddressCheck({
        loading: false,
        result: null,
        error: err.response?.data?.message || t('admin.contracts.address.errorCheck')
      });
    }
  };

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

  // --- ИЗМЕНЕНО: Теперь вызывает умный эндпоинт на бекенде ---
  const handleStartProduction = async (item) => {
    try {
      await axios.post(`${API}/api/contract-products/${item.id}/start_production/`, {}, { headers });
      refresh();
      alert(t('admin.contracts.alert.productionStarted', { product: item.product_name }));
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.contracts.confirm.deleteContract'))) return;
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
    if (!confirm(t('admin.contracts.confirm.deleteItem'))) return;
    await axios.delete(`${API}/api/contract-products/${itemId}/`, { headers });
    refresh();
  };

  const openEdit = (c) => {
    setForm({ client_name: c.client_name, phone: c.phone, address: c.address });
    setEditingId(c.id);
    setShowForm(true);
  };

  const downloadContract = (contractId) => {
    window.open(`${API}/api/contracts/${contractId}/generate/pdf/`, '_blank');
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.contracts.title')}</h2>
        <button style={s.btn} onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setForm(emptyForm);
        }}>
          {t('admin.contracts.buttons.newContract')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
            {editingId ? t('admin.contracts.form.editTitle') : t('admin.contracts.form.newTitle')}
          </h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.contracts.form.clientName')}</label>
              <input
                style={s.input}
                required
                value={form.client_name}
                onChange={e => setForm({ ...form, client_name: e.target.value })}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.contracts.form.phone')}</label>
              <input
                style={s.input}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.contracts.form.address')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={s.input}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
                <button
                  type="button"
                  style={s.checkBtn}
                  onClick={checkAddress}
                  disabled={addressCheck.loading || !form.address.trim()}>
                  {addressCheck.loading
                    ? t('admin.contracts.address.checking')
                    : t('admin.contracts.address.check')}
                </button>
              </div>

              {addressCheck.result && (
                <div style={{
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 8,
                  background: addressCheck.result.valid ? '#dcfce7' : '#fee2e2',
                  color: addressCheck.result.valid ? '#166534' : '#991b1b',
                  fontSize: 13
                }}>
                  {addressCheck.result.message}
                  {addressCheck.result.formatted_address && (
                    <div style={{ marginTop: 4, fontWeight: 500 }}>
                      {addressCheck.result.formatted_address}
                    </div>
                  )}
                </div>
              )}

              {addressCheck.error && (
                <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13 }}>
                  {addressCheck.error}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={s.btn} type="submit">
              {editingId ? t('common.save') : t('common.create')}
            </button>
            <button
              style={s.cancelBtn}
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setAddressCheck({ loading: false, result: null, error: null });
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      <div style={s.list}>
        {contracts.length === 0 && (
          <div style={s.empty}>{t('admin.contracts.empty')}</div>
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

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={s.expandBtn}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  {expanded === c.id
                    ? t('common.hide')
                    : `${t('common.showPositions')} (${c.items.length})`}
                </button>
                <button style={s.editBtn} onClick={() => openEdit(c)}>
                  {t('common.edit')}
                </button>
                <button style={s.delBtn} onClick={() => handleDelete(c.id)}>
                  {t('common.delete')}
                </button>
              </div>
            </div>

            <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8 }}>
              <button
                style={s.generatePdfBtn}
                onClick={() => downloadContract(c.id)}>
                📕 {t('admin.contracts.buttons.downloadPdf')}
              </button>
            </div>

            {expanded === c.id && (
              <div style={s.itemsBlock}>
                <table style={s.table}>
                  <thead>
                    <tr style={{ background: '#f9f9f9' }}>
                      <th style={s.th}>{t('admin.contracts.table.product')}</th>
                      <th style={s.th}>{t('admin.contracts.table.quantity')}</th>
                      <th style={s.th}>{t('admin.contracts.table.price')}</th>
                      <th style={s.th}>{t('admin.contracts.table.productionDate')}</th>
                      <th style={s.th}>{t('admin.contracts.table.status')}</th>
                      <th style={s.th}>{t('admin.contracts.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.items.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 20, color: '#aaa', textAlign: 'center' }}>
                          {t('admin.contracts.table.noItems')}
                        </td>
                      </tr>
                    )}
                    {c.items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={s.td}>{item.product_name}</td>
                        <td style={s.td}>{item.quantity} {t('common.units.pcs')}</td>
                        <td style={s.td}>{Number(item.price).toLocaleString()} {t('common.currency')}</td>
                        <td style={s.td}>
                          {item.production_date
                            ? new Date(item.production_date).toLocaleDateString('ru-RU')
                            : '—'}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontWeight: 600,
                            fontSize: 12,
                            background: item.status === 'completed' ? '#dcfce7' :
                                        item.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
                            color: item.status === 'completed' ? '#16a34a' :
                                   item.status === 'in_progress' ? '#1d4ed8' : '#888',
                          }}>
                            {t(`status.${item.status}`)}
                          </span>
                        </td>
                        <td style={s.td}>
                          {item.status === 'pending' && (
                            <button style={s.startBtn} onClick={() => handleStartProduction(item)}>
                              ▶ {t('admin.contracts.buttons.startProduction')}
                            </button>
                          )}
                          <button style={s.delBtn} onClick={() => handleRemoveItem(item.id)}>
                            {t('common.delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {showItemForm === c.id ? (
                  <form onSubmit={(e) => handleAddItem(e, c.id)} style={s.itemForm}>
                    <select style={s.select} required value={itemForm.product}
                      onChange={e => setItemForm({ ...itemForm, product: e.target.value })}>
                      <option value="">{t('admin.contracts.form.selectProduct')}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      style={{ ...s.input, width: 80 }}
                      type="number"
                      min="1"
                      placeholder={t('common.quantity')}
                      value={itemForm.quantity}
                      onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                    />
                    <input
                      style={{ ...s.input, width: 140 }}
                      type="number"
                      placeholder={t('common.price')}
                      value={itemForm.price}
                      onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                    />
                    <input
                      style={{ ...s.input, width: 160 }}
                      type="date"
                      value={itemForm.production_date}
                      onChange={e => setItemForm({ ...itemForm, production_date: e.target.value })}
                    />
                    <button style={s.btn} type="submit">{t('common.add')}</button>
                    <button style={s.cancelBtn} type="button" onClick={() => setShowItemForm(null)}>
                      {t('common.cancel')}
                    </button>
                  </form>
                ) : (
                  <button
                    style={{ ...s.expandBtn, marginTop: 12 }}
                    onClick={() => setShowItemForm(c.id)}
                  >
                    {t('admin.contracts.buttons.addItem')}
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

// ==================== СТИЛИ ====================
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
  generatePdfBtn: {
    background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px',
    borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13
  },
  checkBtn: {
    background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px',
    borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14,
    whiteSpace: 'nowrap'
  },
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
  badge:      { padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  itemForm:   { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                paddingTop: 12, borderTop: '1px dashed #e0e0e0', marginTop: 8 },
  startBtn:   { background: '#dbeafe', color: '#1d4ed8', border: 'none',
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                fontWeight: 500, marginRight: 6 },
};