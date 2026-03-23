import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

export default function Reports() {
  const [activeTab, setActiveTab]       = useState('materials');
  const [transactions, setTransactions] = useState([]);
  const [contracts, setContracts]       = useState([]);
  const [productions, setProductions]   = useState([]);
  const [products, setProducts]         = useState([]);
  const [loading, setLoading]           = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/transactions/`, { headers }),
      axios.get(`${API}/api/contracts/`, { headers }),
      axios.get(`${API}/api/productions/`, { headers }),
      axios.get(`${API}/api/products/`, { headers }),
    ]).then(([t, c, p, pr]) => {
      setTransactions(t.data);
      setContracts(c.data);
      setProductions(p.data);
      setProducts(pr.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Загрузка...</p>;

  // Считаем прибыль по каждому изделию
  const profitByProduct = products.map(product => {
    const productProductions = productions.filter(
      p => p.product === product.id || p.product_name === product.name
    );

    // Себестоимость = сумма списаний материалов для этого изделия
    const materialCost = transactions
      .filter(t => t.transaction_type === 'out')
      .reduce((sum, t) => sum + parseFloat(t.quantity || 0), 0);

    const revenue = parseFloat(product.price) * productProductions.length;
    const profit  = revenue - materialCost;

    return {
      id:          product.id,
      name:        product.name,
      price:       product.price,
      count:       productProductions.length,
      revenue:     revenue,
      profit:      profit,
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
  const writeOffs = transactions.filter(t => t.transaction_type === 'out');
  const supplies  = transactions.filter(t => t.transaction_type === 'in');

  const tabs = [
    { key: 'materials', label: '📦 Движение материалов' },
    { key: 'profit',    label: '💰 Прибыль по изделиям' },
    { key: 'contracts', label: '📋 Статистика договоров' },
  ];

  return (
    <div style={s.page}>
      <h2 style={s.title}>Отчёты</h2>

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
              <div style={s.summaryLabel}>Списаний</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
              <div style={s.summaryNum}>{supplies.length}</div>
              <div style={s.summaryLabel}>Поставок</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #3b82f6' }}>
              <div style={s.summaryNum}>{transactions.length}</div>
              <div style={s.summaryLabel}>Всего транзакций</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Дата</th>
                <th style={s.th}>Материал</th>
                <th style={s.th}>Тип</th>
                <th style={s.th}>Количество</th>
                <th style={s.th}>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={5} style={s.empty}>Нет данных</td></tr>
              )}
              {transactions.map(t => (
                <tr key={t.id} style={s.tr}>
                  <td style={s.td}>
                    {new Date(t.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={s.td}>{t.material_name}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      background: t.transaction_type === 'in' ? '#dcfce7' : '#fee2e2',
                      color:      t.transaction_type === 'in' ? '#16a34a' : '#dc2626',
                    }}>
                      {t.transaction_type === 'in' ? '+ Поставка' : '- Списание'}
                    </span>
                  </td>
                  <td style={s.td}>{t.quantity}</td>
                  <td style={s.td}>{t.comment || '—'}</td>
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
              <div style={s.summaryLabel}>Изделий произведено</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
              <div style={s.summaryNum}>
                {profitByProduct.reduce((s, p) => s + p.revenue, 0).toLocaleString()} сум
              </div>
              <div style={s.summaryLabel}>Общая выручка</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Изделие</th>
                <th style={s.th}>Цена продажи</th>
                <th style={s.th}>Кол-во производств</th>
                <th style={s.th}>Выручка</th>
              </tr>
            </thead>
            <tbody>
              {profitByProduct.length === 0 && (
                <tr><td colSpan={4} style={s.empty}>Нет данных</td></tr>
              )}
              {profitByProduct.map(p => (
                <tr key={p.id} style={s.tr}>
                  <td style={s.td}><strong>{p.name}</strong></td>
                  <td style={s.td}>{Number(p.price).toLocaleString()} сум</td>
                  <td style={s.td}>{p.count} шт.</td>
                  <td style={s.td}>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {p.revenue.toLocaleString()} сум
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
              <div style={s.summaryLabel}>Всего договоров</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #f59e0b' }}>
              <div style={s.summaryNum}>
                {contractStats.reduce((s, c) => s + c.itemsCount, 0)}
              </div>
              <div style={s.summaryLabel}>Позиций заказано</div>
            </div>
            <div style={{ ...s.summaryCard, borderTop: '4px solid #16a34a' }}>
              <div style={s.summaryNum}>
                {contractStats.reduce((s, c) => s + c.total, 0).toLocaleString()} сум
              </div>
              <div style={s.summaryLabel}>Общая сумма</div>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Клиент</th>
                <th style={s.th}>Телефон</th>
                <th style={s.th}>Дата</th>
                <th style={s.th}>Позиций</th>
                <th style={s.th}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {contractStats.length === 0 && (
                <tr><td colSpan={5} style={s.empty}>Нет данных</td></tr>
              )}
              {contractStats.map(c => (
                <tr key={c.id} style={s.tr}>
                  <td style={s.td}><strong>{c.client}</strong></td>
                  <td style={s.td}>{c.phone || '—'}</td>
                  <td style={s.td}>
                    {new Date(c.date).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={s.td}>{c.itemsCount} шт.</td>
                  <td style={s.td}>
                    <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                      {c.total.toLocaleString()} сум
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