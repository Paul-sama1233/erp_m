import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

export default function WorkerProfile() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [personId, setPersonId] = useState(null);
  const [fullName, setFullName] = useState('');
  const [financeData, setFinanceData] = useState(null);
  const [dates, setDates] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchFinance = useCallback(async (id) => {
    const targetId = id || personId;
    if (!targetId) return;
    try {
      const res = await axios.get(`${API}/api/persons/${targetId}/finance/`, {
        headers,
        params: { start_date: dates.start, end_date: dates.end }
      });
      setFinanceData(res.data);
    } catch (err) {
      console.error("Ошибка при получении финансов:", err);
    }
  }, [personId, dates, headers]);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await axios.get(`${API}/api/me/`, { headers });
        if (meRes.data.person_id) {
          setPersonId(meRes.data.person_id);
          setFullName(meRes.data.full_name || meRes.data.username);
          // Вызываем fetchFinance напрямую с полученным ID
          const fRes = await axios.get(`${API}/api/persons/${meRes.data.person_id}/finance/`, {
            headers,
            params: { start_date: dates.start, end_date: dates.end }
          });
          setFinanceData(fRes.data);
        }
        setLoading(false);
      } catch (err) {
        console.error("Ошибка инициализации:", err);
        setLoading(false);
      }
    };
    init();
  }, []); // Пустой массив, чтобы сработало один раз при загрузке

  if (loading) return <div style={s.loading}>{t('common.loading', 'Загрузка...')}</div>;

  return (
    <div style={s.page}>
      <h2 style={s.title}>{t('worker.salary.title', 'Моя зарплата и налоги')}: <span style={{color: '#84cc16'}}>{fullName}</span></h2>

      <div style={s.contentBlock}>
        <div style={s.filterRow}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input style={s.input} type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} />
            <span style={{color: '#94a3b8'}}>—</span>
            <input style={s.input} type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} />
            <button style={s.calcBtn} onClick={() => fetchFinance()}>
              {t('common.calculate', 'Рассчитать')}
            </button>
          </div>
        </div>

        {financeData && financeData.history.length > 0 ? (
          <>
            <div style={s.summaryGrid}>
              {(() => {
                const totalGross = financeData.history.reduce((sum, row) => sum + parseFloat(row.amount), 0);
                const ndfl = totalGross * 0.12;
                return (
                  <>
                    <div style={{ ...s.summaryCard, borderTop: '4px solid #84cc16' }}>
                      <div style={s.summaryLabel}>{t('salary.gross', 'Начислено')}</div>
                      <div style={s.summaryNum}>{totalGross.toLocaleString()} сум</div>
                    </div>
                    <div style={{ ...s.summaryCard, borderTop: '4px solid #10b981' }}>
                      <div style={s.summaryLabel}>{t('salary.net', 'На руки')}</div>
                      <div style={{ ...s.summaryNum, color: '#10b981' }}>{(totalGross - ndfl).toLocaleString()} сум</div>
                    </div>
                    <div style={{ ...s.summaryCard, borderTop: '4px solid #ef4444' }}>
                      <div style={s.summaryLabel}>{t('salary.tax', 'НДФЛ (12%)')}</div>
                      <div style={{ ...s.summaryNum, color: '#ef4444' }}>{ndfl.toLocaleString()} сум</div>
                    </div>
                  </>
                );
              })()}
            </div>

            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>{t('salary.table.product', 'Изделие')}</th>
                  <th style={s.th}>{t('salary.table.gross', 'Сумма')}</th>
                  <th style={s.th}>{t('salary.table.net', 'На руки (Net)')}</th>
                  <th style={s.th}>{t('salary.table.date', 'Дата')}</th>
                </tr>
              </thead>
              <tbody>
                {financeData.history.map(row => (
                  <tr key={row.id} style={s.tr}>
                    <td style={s.td}><strong>{row.product_name}</strong></td>
                    <td style={s.td}>{parseFloat(row.amount).toLocaleString()}</td>
                    <td style={s.td}><strong style={{ color: '#10b981' }}>{(row.amount * 0.88).toLocaleString()}</strong></td>
                    <td style={s.td}>{new Date(row.date).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={s.empty}>
            <div style={{fontSize: 40, marginBottom: 10}}>📊</div>
            {t('salary.empty', 'Выберите период и нажмите "Рассчитать"')}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '0 0 40px 0' },
  loading: { padding: 40, textAlign: 'center', color: '#64748b' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#0f172a' },
  contentBlock: {
    background: '#fff',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9'
  },
  filterRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 32 },
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none'
  },
  calcBtn: {
    background: '#84cc16', // САЛАТОВЫЙ
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 700,
    marginLeft: 10,
    boxShadow: '0 4px 12px rgba(132,204,22,0.2)',
    transition: '0.2s'
  },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 },
  summaryCard: {
    background: '#f8fafc',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    transition: '0.3s'
  },
  summaryLabel: { fontSize: '11px', color: '#64748b', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  summaryNum: { fontSize: '22px', fontWeight: 800, color: '#0f172a' },

  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  thead: { background: '#f8fafc' },
  th: { textAlign: 'left', padding: '16px', fontSize: '12px', color: '#64748b', borderBottom: '2px solid #f1f5f9', textTransform: 'uppercase', fontWeight: 700 },
  tr: { transition: '0.2s', '&:hover': { background: '#f8fafc' } },
  td: { padding: '16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }
};