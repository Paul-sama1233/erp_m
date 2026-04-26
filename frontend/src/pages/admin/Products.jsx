import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';
const emptyForm = { name: '', price: '' };

export default function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate(); // Исправлено: убраны фигурные скобки
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/api/products/`, { headers });
      setProducts(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Ошибка при загрузке изделий", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/api/products/`, form, { headers });
      setForm(emptyForm);
      setShowForm(false);
      // После создания сразу перекидываем на страницу настройки (детализации)
      navigate(`/admin/products/${res.data.id}`);
    } catch (err) {
      alert(t('common.error'));
    }
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      {/* Шапка с кнопкой добавления слева */}
      <div style={s.header}>
        <button style={s.addBtn} onClick={() => { setForm(emptyForm); setShowForm(true); }}>
          + {t('admin.products.buttons.add')}
        </button>
        <h2 style={s.title}>{t('admin.products.title')}</h2>
      </div>

      {/* Модальное окно создания (чтобы не загромождать интерфейс) */}
      {showForm && (
        <div style={s.modalOverlay}>
          <form onSubmit={handleSubmit} style={s.modal}>
            <h3 style={{ margin: '0 0 16px' }}>{t('admin.products.form.newTitle')}</h3>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.products.form.name')}</label>
              <input
                style={s.input}
                placeholder={t('admin.products.form.namePlaceholder')}
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>{t('admin.products.form.price')}</label>
              <input
                style={s.input}
                type="number"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button style={s.saveBtn} type="submit">{t('admin.products.buttons.create')}</button>
              <button style={s.cancelBtn} type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Сетка карточек изделий */}
      <div style={s.grid}>
        {products.length === 0 && <div style={s.empty}>{t('admin.products.empty')}</div>}

        {products.map(p => (
          <div key={p.id} style={s.card} onClick={() => navigate(`/admin/products/${p.id}`)}>
            <div style={s.imageContainer}>
              {p.image ? (
                <img src={p.image} alt={p.name} style={s.image} />
              ) : (
                <div style={s.imagePlaceholder}>🪑</div>
              )}
            </div>
            <div style={s.cardInfo}>
              <span style={s.productName}>{p.name}</span>
              <span style={s.productPrice}>
                {Number(p.price).toLocaleString()} <small>{t('common.currency')}</small>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '32px', minHeight: '100vh' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '32px'
  },
  title: { margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' },
  addBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '24px'
  },
  empty: { gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#aaa' },

  // Карточка
  card: {
    background: 'var(--bg-card, #fff)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid var(--border-color, #eee)'
  },
  cardHover: { transform: 'translateY(-5px)' }, // Для реализации через JS если нужно
  imageContainer: {
    width: '100%',
    height: '200px',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #f0f0f0'
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  imagePlaceholder: { fontSize: '64px', opacity: 0.2 },

  cardInfo: {
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  productName: {
    fontWeight: 600,
    fontSize: '16px',
    color: 'var(--text-main)',
    maxWidth: '60%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  productPrice: {
    fontWeight: 700,
    fontSize: '16px',
    color: '#6366f1'
  },

  // Модалка
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    background: '#fff', padding: '32px', borderRadius: '20px',
    width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#666' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  saveBtn: {
    flex: 1, background: '#6366f1', color: '#fff', border: 'none',
    padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
  },
  cancelBtn: {
    flex: 1, background: '#f3f4f6', color: '#374151', border: 'none',
    padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
  }
};