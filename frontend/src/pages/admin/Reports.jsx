import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

export default function Reports() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab]       = useState('materials');
  const [transactions, setTransactions] = useState([]);
  const [contracts, setContracts]       = useState([]);
  const [productions, setProductions]   = useState([]);
  const [products, setProducts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [salaries, setSalaries]         = useState([]);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/transactions/`, { headers }),
      axios.get(`${API}/api/contracts/`, { headers }),
      axios.get(`${API}/api/productions/`, { headers }),
      axios.get(`${API}/api/reports/salaries/`, { headers }),
      axios.get(`${API}/api/products/`, { headers }),
    ]).then(([t_res, c, p, sal, pr]) => {
      setTransactions(t_res.data);
      setContracts(c.data);
      setProductions(p.data);
      setSalaries(sal.data);
      setProducts(pr.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  // Считаем прибыль по каждому изделию
  const profitByProduct = products.map(product => {
    const productProductions = productions.filter(
      p => p.product === product.id || p.product_name === product.name
    );

    const count = productProductions.length;
    const price = parseFloat(product.price) || 0;

    const revenue = price * count;           // 100% (Выручка)
    const laborCost = revenue * 0.45;        // 45% (Зарплаты/ФОТ)
    const expensesCost = revenue * 0.45;     // 45% (Ресурсы, аренда)
    const netProfit = revenue * 0.10;        // 10% (Чистая прибыль)

    return {
      id:           product.id,
      name:         product.name,
      price:        price,
      count:        count,
      revenue:      revenue,
      laborCost:    laborCost,
      expensesCost: expensesCost,
      profit:       netProfit,
    };
  }).filter(p => p.count > 0);

  // Общая статистика по договорам
  const contractStats = contracts.map(c => ({
    id:         c.id,
    client:     c.client_name,
    phone:      c.phone,
    date:       c.created_at,
    itemsCount: c.items?.length || 0,
    total:      c.items?.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0) || 0,
  }));

  // Списания материалов
  const writeOffs = transactions.filter(t_obj => t_obj.transaction_type === 'out');
  const supplies  = transactions.filter(t_obj => t_obj.transaction_type === 'in');

  const tabs = [
    { key: 'materials', label: t('admin.reports.tabs.materials') },
    { key: 'profit',    label: t('admin.reports.tabs.profit') },
    { key: 'salaries',  label: t('admin.reports.tabs.salaries') },
    { key: 'contracts', label: t('admin.reports.tabs.contracts') },
  ];

  return (
    <div style={s.page}>
      <h2 style={s.title}>{t('admin.reports.title')}</h2>

      {/* Вкладки */}
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

      {/* Вкладка: Движение материалов */}
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
                      {t_obj.transaction_type === 'in' ? t('admin.reports.materials.supply') : t('admin.reports.materials.writeOff')}
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

      {/* Вкладка: Прибыль по изделиям */}
      {activeTab === 'profit' && (
        <div>
          <div style={s.summaryRow}>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #4f46e5' }}>
              <div style={s.summaryNum}>{profitByProduct.length}</div>
              <div style={s.summaryLabel}>{t('admin.reports.profit.productsProduced')}</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #3b82f6' }}>
              <div style={s.summaryNum}>
                {profitByProduct.reduce((s_val, p) => s_val + p.revenue, 0).toLocaleString()} {t('common.currency')}
              </div>
              <div style={s.summaryLabel}>{t('admin.reports.profit.totalRevenue')}</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
              <div style={s.summaryNum}>
                {profitByProduct.reduce((s_val, p) => s_val + p.profit, 0).toLocaleString()} {t('common.currency')}
              </div>
              <div style={s.summaryLabel}>{t('admin.reports.profit.netProfit')}</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>{t('admin.reports.profit.table.product')}</th>
                <th style={s.th}>{t('admin.reports.profit.table.price')}</th>
                <th style={s.th}>{t('admin.reports.profit.table.count')}</th>
                <th style={s.th}>{t('admin.reports.profit.table.revenue')}</th>
                <th style={s.th}>{t('admin.reports.profit.table.labor')}</th>
                <th style={s.th}>{t('admin.reports.profit.table.expenses')}</th>
                <th style={s.th}>{t('admin.reports.profit.table.netProfit')}</th>
              </tr>
            </thead>
            <tbody>
              {profitByProduct.length === 0 && (
                <tr><td colSpan={7} style={s.empty}>{t('admin.reports.empty')}</td></tr>
              )}
              {profitByProduct.map(p => (
                <tr key={p.id} style={s.tr}>
                  <td style={s.td}><strong>{p.name}</strong></td>
                  <td style={s.td}>{p.price.toLocaleString()} {t('common.currency')}</td>
                  <td style={s.td}>{p.count} {t('common.units.pcs')}</td>
                  <td style={s.td}><strong>{p.revenue.toLocaleString()}</strong></td>
                  <td style={s.td}>
                    <span style={{ color: '#ef4444' }}>-{p.laborCost.toLocaleString()}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ color: '#f59e0b' }}>-{p.expensesCost.toLocaleString()}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {p.profit.toLocaleString()} {t('common.currency')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Вкладка: Заработные платы */}
      {activeTab === 'salaries' && (
        <div>
          <div style={s.summaryRow}>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #14b8a6' }}>
              <div style={s.summaryNum}>
                {salaries.reduce((sum, w) => sum + parseFloat(w.total_earned), 0).toLocaleString()} {t('common.currency')}
              </div>
              <div style={s.summaryLabel}>{t('admin.reports.salaries.totalFund')}</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>{t('admin.reports.salaries.table.worker')}</th>
                <th style={s.th}>{t('admin.reports.salaries.table.specialization')}</th>
                <th style={s.th}>{t('admin.reports.salaries.table.completedProducts')}</th>
                <th style={s.th}>{t('admin.reports.salaries.table.totalEarned')}</th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 && (
                <tr><td colSpan={4} style={s.empty}>{t('admin.reports.empty')}</td></tr>
              )}
              {salaries.map(worker => (
                <tr key={worker.worker__id} style={s.tr}>
                  <td style={s.td}><strong>{worker.worker__full_name}</strong></td>
                  <td style={s.td}>{t(`specializations.${worker.worker__specialization}`)}</td>
                  <td style={s.td}>{worker.completed_products} {t('common.units.pcs')}</td>
                  <td style={s.td}>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {Number(worker.total_earned).toLocaleString()} {t('common.currency')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Вкладка: Статистика по договорам */}
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
    </div>
  );
}

const s = {
  page:        { padding: 32 },
  title:       { margin: '0 0 24px', fontSize: 22, fontWeight: 700 },
  tabs:        { display: 'flex', gap: 8, marginBottom: 24,
                 borderBottom: '2px solid #f0f0f0', paddingBottom: 0 },
  tab:         { padding: '10px 20px', border: 'none', background: 'transparent',
                 cursor: 'pointer', fontWeight: 500, fontSize: 14, color: '#888',
                 borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive:   { color: '#4f46e5', borderBottom: '2px solid #4f46e5', fontWeight: 600 },
  summaryRow:  { display: 'flex', gap: 16, marginBottom: 24 },
  summaryCard: { background: '#fff', borderRadius: 12, padding: '16px 24px',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.07)', minWidth: 160 },
  summaryNum:  { fontSize: 24, fontWeight: 800, color: '#1e1b4b' },
  summaryLabel:{ color: '#888', fontSize: 13, marginTop: 4 },
  table:       { width: '100%', borderCollapse: 'collapse', background: '#fff',
                 borderRadius: 12, overflow: 'hidden',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  thead:       { background: '#f0f0f0' },
  th:          { padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 14 },
  tr:          { borderBottom: '1px solid #f0f0f0' },
  td:          { padding: '12px 16px', fontSize: 14 },
  badge:       { padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
  empty:       { textAlign: 'center', padding: 24, color: '#aaa' },
};