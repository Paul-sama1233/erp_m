import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

const SPECIALIZATION_COLORS = {
  frame:      '#3b82f6',
  springs:    '#8b5cf6',
  sewing:     '#ec4899',
  foam:       '#f59e0b',
  upholstery: 'rgb(16,185,129)',
  none:       '#9ca3af',
};

// Добавлены поля username и password
const emptyForm = { full_name: '', phone: '', specialization: 'none', username: '', password: '' };

export default function Persons() {
  const { t } = useTranslation();

  const [persons, setPersons]       = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [editingId, setEditingId]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const refresh = () => setRefreshKey(k => k + 1);

  const fetchAll = async () => {
    const res = await axios.get(`${API}/api/persons/`, { headers });
    setPersons(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [refreshKey]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    // При редактировании подтягиваем логин, но пароль оставляем пустым
    setForm({
        full_name: p.full_name,
        phone: p.phone,
        specialization: p.specialization,
        username: p.login || '',
        password: ''
    });
    setEditingId(p.id);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Если пароль не ввели при редактировании, не отправляем его, чтобы он не изменился
        const dataToSend = { ...form };
        if (!dataToSend.password) delete dataToSend.password;

        await axios.put(`${API}/api/persons/${editingId}/`, dataToSend, { headers });
      } else {
        await axios.post(`${API}/api/persons/`, form, { headers });
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      refresh();
    } catch (err) {
      alert(err.response?.data?.username ? "Этот логин уже занят!" : t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(t('admin.persons.confirm.delete'))) return;
    try {
        await axios.delete(`${API}/api/persons/${id}/`, { headers });
        refresh();
    } catch (err) {
        alert(t('common.error'));
    }
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.persons.title')}</h2>
        <button style={s.btn} onClick={openCreate}>
          {t('admin.persons.buttons.add')}
        </button>
      </div>

      {/* Форма создания (общая для новой и редактирования, вынесена наверх) */}
      {showForm && !editingId && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
            {t('admin.persons.form.newTitle')}
          </h3>
          <div style={s.formGrid}>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.persons.form.fullName')}</label>
              <input style={s.input} required placeholder="Иванов Иван Иванович"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.persons.form.phone')}</label>
              <input style={s.input} placeholder="+998 90 123 45 67"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.persons.form.specialization')}</label>
              <select style={s.select}
                value={form.specialization}
                onChange={e => setForm({ ...form, specialization: e.target.value })}>
                <option value="none">{t('specializations.none')}</option>
                <option value="frame">{t('specializations.frame')}</option>
                <option value="springs">{t('specializations.springs')}</option>
                <option value="sewing">{t('specializations.sewing')}</option>
                <option value="foam">{t('specializations.foam')}</option>
                <option value="upholstery">{t('specializations.upholstery')}</option>
              </select>
            </div>
            {/* Новые поля для аккаунта */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Логин (для входа)</label>
              <input style={s.input} required placeholder="Например: ivanov"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Пароль</label>
              <input style={s.input} type="password" required placeholder="Введите пароль"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={s.btn} type="submit">{t('common.add')}</button>
            <button style={s.cancelBtn} type="button"
              onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {/* Список сотрудников */}
      <div style={s.grid}>
        {persons.length === 0 && (
          <div style={s.empty}>{t('admin.persons.empty')}</div>
        )}
        {persons.map(p => (
          <div key={p.id} style={s.card}>
            {editingId === p.id ? (
              // Встроенная форма редактирования
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15, color: '#4f46e5' }}>
                  ✏️ {t('admin.persons.form.editTitle')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={s.fieldGroup}>
                      <label style={s.label}>ФИО</label>
                      <input style={s.input} required placeholder="ФИО"
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div style={s.fieldGroup}>
                      <label style={s.label}>Специализация</label>
                      <select style={s.select}
                        value={form.specialization}
                        onChange={e => setForm({ ...form, specialization: e.target.value })}>
                        <option value="none">{t('specializations.none')}</option>
                        <option value="frame">{t('specializations.frame')}</option>
                        <option value="springs">{t('specializations.springs')}</option>
                        <option value="sewing">{t('specializations.sewing')}</option>
                        <option value="foam">{t('specializations.foam')}</option>
                        <option value="upholstery">{t('specializations.upholstery')}</option>
                      </select>
                  </div>
                  <div style={s.fieldGroup}>
                      <label style={s.label}>Телефон</label>
                      <input style={s.input} placeholder="Телефон"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div style={s.fieldGroup}>
                      <label style={s.label}>Логин</label>
                      <input style={s.input} placeholder="Логин"
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })} />
                  </div>
                  <div style={{...s.fieldGroup, gridColumn: '1 / -1'}}>
                      <label style={s.label}>Новый пароль (оставьте пустым, если не меняете)</label>
                      <input style={s.input} type="password" placeholder="Новый пароль"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button style={s.btn} type="submit">{t('common.save')}</button>
                  <button style={s.cancelBtn} type="button"
                    onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
                </div>
              </form>
            ) : (
              // Карточка сотрудника
              <>
                <div style={s.avatar}>
                  {p.full_name.charAt(0).toUpperCase()}
                </div>
                <div style={s.info}>
                  <div style={s.name}>{p.full_name}</div>
                  {p.phone && <div style={s.phone}>📞 {p.phone}</div>}
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                      <span style={{
                        ...s.badge,
                        background: SPECIALIZATION_COLORS[p.specialization] + '20',
                        color: SPECIALIZATION_COLORS[p.specialization],
                      }}>
                        {t(`specializations.${p.specialization}`)}
                      </span>
                      {p.login && (
                          <span style={s.loginBadge}>🔑 {p.login}</span>
                      )}
                  </div>
                </div>
                <div style={s.actions}>
                  <button style={s.editBtn} onClick={() => openEdit(p)}>
                    {t('common.edit')}
                  </button>
                  <button style={s.delBtn} onClick={() => handleDelete(p.id)}>
                    {t('common.delete')}
                  </button>
                </div>
              </>
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
  form:       { background: '#f8f8ff', padding: 24, borderRadius: 12,
                marginBottom: 24, border: '1px solid #e0e0f0' },
  formGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label:      { fontSize: 13, fontWeight: 600, color: '#555' },
  input:      { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  select:     { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  empty:      { gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#aaa' },
  card:       { background: '#fff', borderRadius: 12, padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0',
                display: 'flex', alignItems: 'flex-start', gap: 16 },
  avatar:     { width: 48, height: 48, borderRadius: '50%', background: '#4f46e5',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, flexShrink: 0 },
  info:       { flex: 1 },
  name:       { fontWeight: 700, fontSize: 15, marginBottom: 4 },
  phone:      { color: '#666', fontSize: 13, marginBottom: 6 },
  badge:      { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  loginBadge: { background: '#f3f4f6', border: '1px solid #d1d5db', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#4b5563' },
  actions:    { display: 'flex', flexDirection: 'column', gap: 6 },
};