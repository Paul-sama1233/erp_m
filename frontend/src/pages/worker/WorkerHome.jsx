import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';   // ← Добавлено

const SPEC_COLORS = {
  frame:      '#3b82f6',
  springs:    '#8b5cf6',
  sewing:     '#ec4899',
  foam:       '#f59e0b',
  upholstery: '#10b981',
  none:       '#9ca3af',
};

export default function WorkerHome() {
  const { user } = useAuth();
  const { t } = useTranslation();                  // ← Добавлено
  const spec = user?.specialization || 'none';

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.avatarBig}>
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <h2 style={s.name}>{user?.username}</h2>
        <span style={{
          ...s.specBadge,
          background: SPEC_COLORS[spec] + '20',
          color: SPEC_COLORS[spec],
        }}>
          {t(`specializations.${spec}`)}               {/* ← Перевод специализации */}
        </span>
        <div style={s.info}>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>{t('worker.home.roleLabel')}</span>
            <span>{t('worker.home.roleValue')}</span>   {/* «Работник цеха» */}
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>{t('worker.home.specializationLabel')}</span>
            <span>{t(`specializations.${spec}`)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:      { padding: 32, display: 'flex', justifyContent: 'center' },
  card:      { background: '#fff', borderRadius: 16, padding: 40,
               boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
               textAlign: 'center', maxWidth: 400, width: '100%' },
  avatarBig: { width: 80, height: 80, borderRadius: '50%', background: '#4f46e5',
               color: '#fff', display: 'flex', alignItems: 'center',
               justifyContent: 'center', fontSize: 32, fontWeight: 700,
               margin: '0 auto 16px' },
  name:      { margin: '0 0 8px', fontSize: 22, fontWeight: 700 },
  specBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: 20,
               fontWeight: 600, fontSize: 14, marginBottom: 24 },
  info:      { textAlign: 'left', borderTop: '1px solid #f0f0f0', paddingTop: 20 },
  infoRow:   { display: 'flex', justifyContent: 'space-between',
               padding: '8px 0', fontSize: 14 },
  infoLabel: { color: '#888', fontWeight: 500 },
};