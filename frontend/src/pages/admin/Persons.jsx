import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

const SPEC_COLORS = {
  frame: '#3b82f6', springs: '#8b5cf6', sewing: '#ec4899',
  foam: '#f59e0b', upholstery: '#10b981', none: '#9ca3af',
};

const emptyForm = { full_name: '', phone: '', address: '', specialization: 'none', username: '', password: '', language: 'ru', photo: null };

export default function Persons() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [persons, setPersons] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchPersons = async () => {
    try {
      const res = await axios.get(`${API}/api/persons/`, { headers });
      setPersons(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchPersons(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if (form[key] !== null) formData.append(key, form[key]);
    });

    try {
      const res = await axios.post(`${API}/api/persons/`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setShowAddForm(false);
      // После успешного создания сразу "проваливаемся" в личное дело
      navigate(`/admin/persons/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.username ? "Этот логин уже занят!" : t('common.error'));
    }
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{t('admin.persons.title')}</h2>
        <button style={s.addBtn} onClick={() => { setForm(emptyForm); setShowAddForm(true); }}>
          + {t('admin.persons.buttons.add')}
        </button>
      </div>

      {/* Модалка быстрого добавления (только самые важные поля) */}
      {showAddForm && (
        <div style={s.modalOverlay}>
          <form onSubmit={handleSubmit} style={s.modal}>
            <h3 style={{ margin: '0 0 16px' }}>{t('admin.persons.form.newTitle')}</h3>
            <div style={s.fieldGroup}>
              <label style={s.label}>ФИО</label>
              <input style={s.input} required placeholder="Иванов Иван" onChange={e => setForm({...form, full_name: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={s.fieldGroup}>
                <label style={s.label}>Логин</label>
                <input style={s.input} required placeholder="ivanov" onChange={e => setForm({...form, username: e.target.value})} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Пароль</label>
                <input style={s.input} type="password" required onChange={e => setForm({...form, password: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button style={s.saveBtn} type="submit">{t('common.create')}</button>
              <button style={s.cancelBtn} type="button" onClick={() => setShowAddForm(false)}>{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Сетка сотрудников (только просмотр) */}
      <div style={s.grid}>
        {persons.length === 0 && <div style={s.empty}>{t('admin.persons.empty')}</div>}
        {persons.map(p => (
          <div key={p.id} style={s.card} onClick={() => navigate(`/admin/persons/${p.id}`)}>
            <div style={s.photoWrapper}>
              {p.photo ? (
                <img src={p.photo} alt={p.full_name} style={s.photo} />
              ) : (
                <div style={s.avatarFallback}>{p.full_name.charAt(0).toUpperCase()}</div>
              )}
              {p.login && <div style={s.loginBadge}>🔑 {p.login}</div>}
            </div>
            <div style={s.info}>
              <div style={s.name}>{p.full_name}</div>
              <div style={{ ...s.specBadge, background: SPEC_COLORS[p.specialization] + '20', color: SPEC_COLORS[p.specialization] }}>
                {t(`specializations.${p.specialization}`)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { padding: 32, minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  addBtn: { background: '#4f46e5', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 },
  empty: { gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#aaa' },

  card: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #eee', display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' },
  photoWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 70 },
  photo: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e0e7ff' },
  avatarFallback: { width: 64, height: 64, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 },
  loginBadge: { background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#4b5563' },

  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 6 },
  specBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', padding: 32, borderRadius: 20, width: '100%', maxWidth: 400 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 },
  label: { fontSize: 12, fontWeight: 600, color: '#6b7280' },
  input: { padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  saveBtn: { flex: 1, background: '#4f46e5', color: '#fff', border: 'none', padding: 10, borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { flex: 1, background: '#e5e7eb', color: '#374151', border: 'none', padding: 10, borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
};