import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

export default function Reports() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab]       = useState('finance');
  const [transactions, setTransactions] = useState([]);
  const [contracts, setContracts]       = useState([]);
  const [financeData, setFinanceData]   = useState([]);
  const [loading, setLoading]           = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/transactions/`, { headers }),
      axios.get(`${API}/api/contracts/`, { headers }),
      axios.get(`${API}/api/reports/finance/`, { headers }),
    ]).then(([t_res, c, f]) => {
      setTransactions(t_res.data);
      setContracts(c.data);
      setFinanceData(f.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  const contractStats = contracts.map(c => ({
    id:         c.id,
    client:     c.client_name,
    phone:      c.phone,
    date:       c.created_at,
    itemsCount: c.items?.length || 0,
    total:      c.items?.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0) || 0,
  }));

  const writeOffs = transactions.filter(t_obj => t_obj.transaction_type === 'out');
  const supplies  = transactions.filter(t_obj => t_obj.transaction_type === 'in');

  const tabs = [
    { key: 'finance',   label: '💰 Финансы (Прибыль и ЗП)' },
    { key: 'materials', label: '📦 Движение материалов' },
    { key: 'contracts', label: '📋 Статистика договоров' },
  ];

  return (
    <div style={s.page}>
      <h2 style={s.title}>{t('admin.reports.title')}</h2>

      <div style={s.tabs}>
        {tabs.map(tab => (
          <button key={tab.key}
            style={{
              ...s.tab,
              ...(activeTab === tab.key ? s.tabActive : {})
            }}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'finance' && (
        <div>
          <div style={s.summaryRow}>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #4f46e5' }}>
              <div style={s.summaryNum}>{financeData.length}</div>
              <div style={s.summaryLabel}>Завершено заказов</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
              <div style={s.summaryNum}>
                {financeData.reduce((sum, item) => sum + parseFloat(item.net_profit), 0).toLocaleString()} {t('common.currency')}
              </div>
              <div style={s.summaryLabel}>Общая чистая прибыль</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Изделие</th>
                <th style={s.th}>Цена продажи</th>
                <th style={s.th}>Материалы</th>
                <th style={s.th}>Зарплата (ФОТ)</th>
                <th style={s.th}>Налоги (5%)</th>
                <th style={s.th}>Аренда (Доля)</th>
                <th style={s.th}>Чистая прибыль</th>
              </tr>
            </thead>
            <tbody>
              {financeData.length === 0 && (
                <tr><td colSpan={7} style={s.empty}>{t('admin.reports.empty')}</td></tr>
              )}
              {financeData.map((item, idx) => (
                <tr key={idx} style={s.tr}>
                  <td style={s.td}>
                    <strong>{item.product_name}</strong>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {new Date(item.date).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td style={s.td}>{Number(item.price).toLocaleString()}</td>
                  <td style={s.td}><span style={{ color: '#ef4444' }}>-{Number(item.material_cost).toLocaleString()}</span></td>
                  <td style={s.td}><span style={{ color: '#f59e0b' }}>-{Number(item.salary_cost).toLocaleString()}</span></td>
                  <td style={s.td}><span style={{ color: '#6366f1' }}>-{Number(item.tax).toLocaleString()}</span></td>
                  <td style={s.td}><span style={{ color: '#8b5cf6' }}>-{Number(item.rent_share).toLocaleString()}</span></td>
                  <td style={s.td}>
                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 15 }}>
                      {Number(item.net_profit).toLocaleString()} {t('common.currency')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'materials' && (
        <div>
          <div style={s.summaryRow}>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #ef4444' }}>
              <div style={s.summaryNum}>{writeOffs.length}</div>
              <div style={s.summaryLabel}>{t('admin.reports.materials.writeOffs')}</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
              <div style={s.summaryNum}>{supplies.length}</div>
              <div style={s.summaryLabel}>{t('admin.reports.materials.supplies')}</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #3b82f6' }}>
              <div style={s.summaryNum}>{transactions.length}</div>
              <div style={s.summaryLabel}>{t('admin.reports.materials.totalTransactions')}</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>{t('admin.reports.materials.table.date')}</th>
                <th style={s.th}>{t('admin.reports.materials.table.material')}</th>
                <th style={s.th}>{t('admin.reports.materials.table.type')}</th>
                <th style={s.th}>{t('admin.reports.materials.table.quantity')}</th>
                <th style={s.th}>{t('admin.reports.materials.table.comment')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={5} style={s.empty}>{t('admin.reports.empty')}</td></tr>
              )}
              {transactions.map(t_obj => (
                <tr key={t_obj.id} style={s.tr}>
                  <td style={s.td}>
                    {new Date(t_obj.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={s.td}>{t_obj.material_name}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      background: t_obj.transaction_type === 'in' ? '#dcfce7' : '#fee2e2',
                      color:      t_obj.transaction_type === 'in' ? '#16a34a' : '#dc2626',
                    }}>
                      {t_obj.transaction_type === 'in' ? 'Поставка' : 'Списание'}
                    </span>
                  </td>
                  <td style={s.td}>{t_obj.quantity}</td>
                  <td style={s.td}>{t_obj.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div>
          <div style={s.summaryRow}>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #6366f1' }}>
              <div style={s.summaryNum}>{contracts.length}</div>
              <div style={s.summaryLabel}>{t('admin.reports.contracts.totalContracts')}</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #f59e0b' }}>
              <div style={s.summaryNum}>
                {contractStats.reduce((s_val, c) => s_val + c.itemsCount, 0)}
              </div>
              <div style={s.summaryLabel}>{t('admin.reports.contracts.itemsOrdered')}</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
              <div style={s.summaryNum}>
                {contractStats.reduce((s_val, c) => s_val + c.total, 0).toLocaleString()} {t('common.currency')}
              </div>
              <div style={s.summaryLabel}>{t('admin.reports.contracts.totalAmount')}</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>{t('admin.reports.contracts.table.client')}</th>
                <th style={s.th}>{t('admin.reports.contracts.table.phone')}</th>
                <th style={s.th}>{t('admin.reports.contracts.table.date')}</th>
                <th style={s.th}>{t('admin.reports.contracts.table.items')}</th>
                <th style={s.th}>{t('admin.reports.contracts.table.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {contractStats.length === 0 && (
                <tr><td colSpan={5} style={s.empty}>{t('admin.reports.empty')}</td></tr>
              )}
              {contractStats.map(c => (
                <tr key={c.id} style={s.tr}>
                  <td style={s.td}><strong>{c.client}</strong></td>
                  <td style={s.td}>{c.phone || '—'}</td>
                  <td style={s.td}>
                    {new Date(c.date).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={s.td}>{c.itemsCount} {t('common.units.pcs')}</td>
                  <td style={s.td}>
                    <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                      {c.total.toLocaleString()} {t('common.currency')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ПЛАВАЮЩАЯ КНОПКА-ССЫЛКА НА СПРАВОЧНИК */}
      <a
        href="https://nrm.uz/products?products=2_maloe_predpriyatie"
        target="_blank"
        rel="noopener noreferrer"
        style={s.helpBtn}
        title="Справочная информация по налогам и учету"
      >
        ?
      </a>
    </div>
  );
}

const s = {
  page:        { padding: 32, minHeight: '100vh', position: 'relative' }, // <-- Добавлено position: relative для кнопки
  title:       { margin: '0 0 24px', fontSize: 24, fontWeight: 700 },
  tabs:        { display: 'flex', gap: 16, marginBottom: 24, borderBottom: '2px solid #f0f0f0' },
  tab:         { padding: '12px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 15, color: '#9ca3af', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive:   { color: '#4f46e5', borderBottom: '2px solid #4f46e5' },
  summaryRow:  { display: 'flex', gap: 16, marginBottom: 24 },
  summaryCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minWidth: 200, border: '1px solid #f3f4f6' },
  summaryNum:  { fontSize: 28, fontWeight: 800, color: '#1f2937' },
  summaryLabel:{ color: '#6b7280', fontSize: 13, marginTop: 6, fontWeight: 500 },
  table:       { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' },
  thead:       { background: '#f8fafc' },
  th:          { padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr:          { borderBottom: '1px solid #f1f5f9', transition: '0.2s' },
  td:          { padding: '14px 16px', fontSize: 14, color: '#334155' },
  badge:       { padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  empty:       { textAlign: 'center', padding: 40, color: '#aaa' },

  // Стили для плавающей кнопки помощи
  helpBtn: {
    position: 'fixed',
    bottom: '40px',
    right: '40px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#4f46e5',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
    cursor: 'pointer',
    zIndex: 1000,
  }
};