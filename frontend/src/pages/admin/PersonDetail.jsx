import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Финансы
  const [dates, setDates] = useState({ start: '', end: '' });
  const [financeData, setFinanceData] = useState(null);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchPerson = async () => {
    try {
      const res = await axios.get(`${API}/api/persons/${id}/`, { headers });
      setForm({
        full_name: res.data.full_name,
        phone: res.data.phone || '',
        address: res.data.address || '',
        specialization: res.data.specialization,
        username: res.data.login || '',
        password: '',
        language: res.data.language || 'ru',
        photoUrl: res.data.photo || null,
        newPhotoFile: null
      });
      setPreviewPhoto(res.data.photo || null);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchPerson(); }, [id]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, newPhotoFile: file });
      setPreviewPhoto(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    formData.append('full_name', form.full_name);
    formData.append('phone', form.phone);
    formData.append('address', form.address);
    formData.append('specialization', form.specialization);
    formData.append('username', form.username);
    formData.append('language', form.language);

    if (form.password) formData.append('password', form.password);
    if (form.newPhotoFile) formData.append('photo', form.newPhotoFile);

    try {
      await axios.patch(`${API}/api/persons/${id}/`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      alert('Профиль успешно обновлен');
      fetchPerson();
    } catch (err) {
      alert(err.response?.data?.username ? "Этот логин уже занят!" : t('common.error'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('admin.persons.confirm.delete'))) return;
    await axios.delete(`${API}/api/persons/${id}/`, { headers });
    navigate('/admin/persons');
  };

  const fetchFinance = async () => {
    try {
      const res = await axios.get(`${API}/api/persons/${id}/finance/`, {
        headers, params: { start_date: dates.start, end_date: dates.end }
      });
      setFinanceData(res.data);
    } catch (err) { alert(t('common.error')); }
  };

  const exportToCSV = () => {
    if (!financeData || !financeData.history || financeData.history.length === 0) {
      alert('Нет данных для скачивания!');
      return;
    }

    const colHeaders = ['Изделие', 'Начислено (Gross)', 'НДФЛ (12%)', 'На руки (Net)', 'Соц. налог', 'Дата'];

    const rows = financeData.history.map(row => {
      const gross = parseFloat(row.amount);
      const ndfl = gross * 0.12;
      const netPay = gross - ndfl;
      const socialTax = gross * 0.12;
      const date = new Date(row.date).toLocaleDateString('ru-RU');

      return [
        `"${row.product_name}"`,
        gross.toFixed(2),
        ndfl.toFixed(2),
        netPay.toFixed(2),
        socialTax.toFixed(2),
        `"${date}"`
      ].join(';');
    });

    const csvContent = [colHeaders.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;

    const safeName = form.full_name ? form.full_name.replace(/\s+/g, '_') : 'Сотрудник';
    const startDateStr = dates.start ? dates.start : 'все_время';
    const endDateStr = dates.end ? dates.end : 'по_сегодня';

    link.download = `Зарплата_${safeName}_${startDateStr}_${endDateStr}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/admin/persons')}>← Назад</button>
        <h2 style={s.title}>Личное дело: {form.full_name}</h2>
      </div>

      <div style={s.tabs}>
        <button style={activeTab === 'profile' ? s.tabActive : s.tab} onClick={() => setActiveTab('profile')}>Профиль сотрудника</button>
        <button style={activeTab === 'salary' ? s.tabActive : s.tab} onClick={() => setActiveTab('salary')}>Зарплата и налоги</button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} style={s.contentBlock}>
          <div style={s.profileGrid}>
            <div style={s.photoSection}>
              <div style={s.photoPreview}>
                {previewPhoto ? <img src={previewPhoto} alt="Preview" style={s.image} /> : <div style={s.noPhoto}>Нет фото</div>}
              </div>
              <label style={s.photoUploadBtn}>
                Выбрать изображение
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </label>
            </div>

            <div style={s.dataSection}>
              <div style={s.fieldGroup}>
                <label style={s.label}>ФИО</label>
                <input style={s.input} required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Телефон</label>
                  <input style={s.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Тип занятости</label>
                  <select style={s.input} value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})}>
                    <option value="none">{t('specializations.none')}</option>
                    <option value="frame">{t('specializations.frame')}</option>
                    <option value="springs">{t('specializations.springs')}</option>
                    <option value="sewing">{t('specializations.sewing')}</option>
                    <option value="foam">{t('specializations.foam')}</option>
                    <option value="upholstery">{t('specializations.upholstery')}</option>
                  </select>
                </div>
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Адрес проживания</label>
                <input style={s.input} placeholder="Улица, дом, квартира" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Логин</label>
                  <input style={s.input} required value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Новый пароль</label>
                  <input style={s.input} type="password" placeholder="***" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
            <button style={s.saveBtn} type="submit">{t('common.save')}</button>
            <button style={s.delBtn} type="button" onClick={handleDelete}>Уволить (Удалить)</button>
          </div>
        </form>
      )}

      {activeTab === 'salary' && (
        <div style={s.contentBlock}>
          <div style={s.filterRow}>
            <input style={s.input} type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} />
            <span>—</span>
            <input style={s.input} type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} />
            <button style={s.calcBtn} onClick={fetchFinance}>Рассчитать</button>

            {financeData && financeData.history.length > 0 && (
              <button
                style={{...s.calcBtn, background: '#4f46e5', marginLeft: 'auto'}}
                onClick={exportToCSV}
              >
                📥 Скачать Excel (CSV)
              </button>
            )}
          </div>

          {financeData ? (
            <>
              {/* СВОДНЫЕ КАРТОЧКИ (ИТОГО ЗА ПЕРИОД) */}
              {financeData.history.length > 0 && (() => {
                const totalGross = financeData.history.reduce((sum, row) => sum + parseFloat(row.amount), 0);
                const totalNdfl = totalGross * 0.12;
                const totalNet = totalGross - totalNdfl;
                const totalSocial = totalGross * 0.12;

                return (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    <div style={{ ...s.summaryCard, borderTop: '4px solid #4f46e5' }}>
                      <div style={s.summaryLabel}>Начислено (Грязными)</div>
                      <div style={{ ...s.summaryNum, color: '#1f2937' }}>{totalGross.toLocaleString()} сум</div>
                    </div>
                    <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
                      <div style={s.summaryLabel}>На руки (Чистыми)</div>
                      <div style={{ ...s.summaryNum, color: '#16a34a' }}>{totalNet.toLocaleString()} сум</div>
                    </div>
                    <div style={{ ...s.summaryCard, borderTop: '4px solid #ef4444' }}>
                      <div style={s.summaryLabel}>Удержано НДФЛ (12%)</div>
                      <div style={{ ...s.summaryNum, color: '#ef4444' }}>{totalNdfl.toLocaleString()} сум</div>
                    </div>
                    <div style={{ ...s.summaryCard, borderTop: '4px solid #f59e0b' }}>
                      <div style={s.summaryLabel}>Соц. налог (от фирмы)</div>
                      <div style={{ ...s.summaryNum, color: '#f59e0b' }}>{totalSocial.toLocaleString()} сум</div>
                    </div>
                  </div>
                );
              })()}

              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>Изделие</th>
                    <th style={s.th}>Грязные</th>
                    <th style={s.th}>НДФЛ (12%)</th>
                    <th style={s.th}>ЗП с налогами</th>
                    <th style={s.th}>Соц. налог (12%)</th>
                    <th style={s.th}>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.history.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                        Данных за выбранный период не найдено
                      </td>
                    </tr>
                  )}
                  {financeData.history.map(row => {
                    const gross = parseFloat(row.amount);
                    const ndfl = gross * 0.12;
                    const netPay = gross - ndfl;
                    const socialTax = gross * 0.12;

                    return (
                      <tr key={row.id} style={s.tr}>
                        <td style={s.td}><strong>{row.product_name}</strong></td>
                        <td style={s.td}>{gross.toLocaleString()} сум</td>
                        <td style={s.td}><span style={{ color: '#ef4444' }}>-{ndfl.toLocaleString()}</span></td>
                        <td style={s.td}><strong style={{ color: '#16a34a' }}>{netPay.toLocaleString()} сум</strong></td>
                        <td style={s.td}><span style={{ color: '#f59e0b' }}>{socialTax.toLocaleString()}</span></td>
                        <td style={s.td}>{new Date(row.date).toLocaleDateString('ru-RU')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ color: '#888', padding: 20 }}>Выберите период и нажмите "Рассчитать"</p>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding: 32 },
  header: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 },
  backBtn: { background: '#f3f4f6', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },

  tabs: { display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', marginBottom: 24 },
  tab: { padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, color: '#6b7280', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#4f46e5', borderBottom: '2px solid #4f46e5', marginBottom: -2 },

  contentBlock: { background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' },
  profileGrid: { display: 'grid', gridTemplateColumns: '250px 1fr', gap: 40 },

  photoSection: { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  photoPreview: { width: 200, height: 250, borderRadius: 12, border: '2px dashed #d1d5db', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  noPhoto: { color: '#9ca3af', fontWeight: 600 },
  photoUploadBtn: { background: '#f3f4f6', color: '#374151', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, textAlign: 'center', width: '100%', border: '1px solid #d1d5db' },

  dataSection: { display: 'flex', flexDirection: 'column', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#4b5563' },
  input: { padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, width: '100%', boxSizing: 'border-box' },

  saveBtn: { background: '#4f46e5', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  delBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },

  filterRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  calcBtn: { background: '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },

  // Стили для карточек "Итого"
  summaryCard: { flex: 1, background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' },
  summaryLabel:{ color: '#6b7280', fontSize: 13, marginBottom: 8, fontWeight: 600 },
  summaryNum:  { fontSize: 20, fontWeight: 800 },

  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px', fontSize: 14, color: '#334155' },
};