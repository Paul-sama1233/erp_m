import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';   // ← Добавлено

const API = 'http://127.0.0.1:8000';

export default function WorkerCalendar() {
  const { t } = useTranslation();                  // ← Добавлено

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/api/my-stages/`, { headers })
      .then(res => {
        setStages(res.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;

  // Группируем по дате производства
  const grouped = {};
  stages.forEach(stage => {
    if (!stage.production_date) return;
    const date = new Date(stage.production_date).toLocaleDateString('ru-RU');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(stage);
  });

  return (
    <div style={s.page}>
      <h2 style={s.title}>{t('worker.calendar.title')}</h2>

      {Object.keys(grouped).length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div>{t('worker.calendar.noTasks')}</div>
        </div>
      ) : (
        <div style={s.list}>
          {Object.entries(grouped)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, stageList]) => (
              <div key={date} style={s.dayBlock}>
                <div style={s.dateHeader}>📅 {date}</div>
                <div style={s.stageList}>
                  {stageList.map(stage => (
                    <div key={stage.id} style={s.stageItem}>
                      <div style={s.stageName}>
                        {t(`stages.${stage.stage_type}`)}     {/* ← Перевод этапа */}
                      </div>
                      <div style={s.productName}>{stage.product_name}</div>
                      <span style={{
                        ...s.badge,
                        background: stage.status === 'completed' ? '#dcfce7' :
                                    stage.status === 'in_progress' ? '#dbeafe' : '#fef9c3',
                        color: stage.status === 'completed' ? '#16a34a' :
                               stage.status === 'in_progress' ? '#1d4ed8' : '#854d0e',
                      }}>
                        {t(`status.${stage.status}`)}         {/* ← Перевод статуса */}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { padding: 32 },
  title:       { margin: '0 0 24px', fontSize: 22, fontWeight: 700 },
  empty:       { textAlign: 'center', padding: 60, color: '#aaa', fontSize: 18 },
  list:        { display: 'flex', flexDirection: 'column', gap: 16 },
  dayBlock:    { background: '#fff', borderRadius: 12, overflow: 'hidden',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  dateHeader:  { background: '#4f46e5', color: '#fff', padding: '12px 20px',
                 fontWeight: 700, fontSize: 15 },
  stageList:   { padding: '8px 0' },
  stageItem:   { display: 'flex', alignItems: 'center', gap: 12,
                 padding: '10px 20px', borderBottom: '1px solid #f0f0f0' },
  stageName:   { fontWeight: 600, fontSize: 14, color: '#4f46e5', minWidth: 120 },
  productName: { flex: 1, fontSize: 14, color: '#374151' },
  badge:       { padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12 },
};