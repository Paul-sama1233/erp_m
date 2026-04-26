import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = 'http://127.0.0.1:8000';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [product, setProduct] = useState(null);
  const [allMaterials, setAllMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Состояния для форм
  const [stageForm, setStageForm] = useState({ stage_type: '', order: 1 });
  const [pmForm, setPmForm] = useState({ material: '', quantity: '', stage_template: '' });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProductData = async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        axios.get(`${API}/api/products/${id}/`, { headers }),
        axios.get(`${API}/api/materials/`, { headers })
      ]);
      setProduct(pRes.data);
      setAllMaterials(mRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Ошибка загрузки данных", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [id]);

  // --- ЭТАПЫ ---
  const handleAddStage = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/product-stage-templates/`, {
        product: id,
        stage_type: stageForm.stage_type,
        order: stageForm.order,
      }, { headers });
      setStageForm({ stage_type: '', order: (product.stage_templates?.length || 0) + 2 });
      fetchProductData();
    } catch (err) {
      alert("Этот этап уже добавлен или данные неверны");
    }
  };

  const handleRemoveStage = async (sid) => {
    if (!window.confirm(t('admin.productions.confirm.deleteStage'))) return;
    await axios.delete(`${API}/api/product-stage-templates/${sid}/`, { headers });
    fetchProductData();
  };

  // --- МАТЕРИАЛЫ ---
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/product-materials/`, {
        product: id,
        material: parseInt(pmForm.material),
        quantity: pmForm.quantity,
        stage_template: pmForm.stage_template || null,
      }, { headers });
      setPmForm({ material: '', quantity: '', stage_template: '' });
      fetchProductData();
    } catch (err) {
      alert(t('common.error'));
    }
  };
  
  const handleRemoveMaterial = async (pmId) => {
    await axios.delete(`${API}/api/product-materials/${pmId}/`, { headers });
    fetchProductData();
  };

  if (loading) return <p style={{ padding: 40 }}>{t('common.loading')}</p>;
  if (!product) return <p style={{ padding: 40 }}>Изделие не найдено</p>;

  return (
    <div style={s.page}>
      {/* Шапка детализации */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/admin/products')}>
          ← {t('common.cancel')}
        </button>
        <h2 style={s.title}>{product.name}</h2>
      </div>

      <div style={s.content}>

        {/* ЛЕВАЯ КОЛОНКА: Этапы производства */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>🛠 {t('admin.products.stagesTitle')}</h3>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Этап</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {product.stage_templates?.map(st => (
                <tr key={st.id} style={s.tr}>
                  <td style={s.td}>{st.order}</td>
                  <td style={s.td}><strong>{st.stage_name}</strong></td>
                  <td style={s.td}>
                    <button style={s.delBtn} onClick={() => handleRemoveStage(st.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={handleAddStage} style={s.inlineForm}>
            <select style={s.select} required value={stageForm.stage_type}
              onChange={e => setStageForm({...stageForm, stage_type: e.target.value})}>
              <option value="">{t('admin.products.selectStage')}</option>
              <option value="frame">{t('stages.frame')}</option>
              <option value="foam">{t('stages.foam')}</option>
              <option value="sewing">{t('stages.sewing')}</option>
              <option value="upholstery">{t('stages.upholstery')}</option>
            </select>
            <input style={{...s.input, width: 60}} type="number" value={stageForm.order}
              onChange={e => setStageForm({...stageForm, order: e.target.value})} />
            <button style={s.addBtn} type="submit">+</button>
          </form>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Материалы по этапам */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>📦 {t('admin.products.materialsTitle')}</h3>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Этап</th>
                <th style={s.th}>Материал</th>
                <th style={s.th}>Кол-во</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {product.materials?.map(pm => (
                <tr key={pm.id} style={s.tr}>
                  <td style={s.td}><span style={s.badge}>{pm.stage_name || 'Общий'}</span></td>
                  <td style={s.td}>{pm.material_name}</td>
                  <td style={s.td}>{pm.quantity} {pm.material_unit}</td>
                  <td style={s.td}>
                    <button style={s.delBtn} onClick={() => handleRemoveMaterial(pm.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={handleAddMaterial} style={s.materialForm}>
            <select style={s.select} required value={pmForm.material}
              onChange={e => setPmForm({...pmForm, material: e.target.value})}>
              <option value="">{t('admin.products.form.selectMaterial')}</option>
              {allMaterials.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </select>

            <select style={s.select} value={pmForm.stage_template}
              onChange={e => setPmForm({...pmForm, stage_template: e.target.value})}>
              <option value="">{t('admin.products.forWhichStage')}</option>
              {product.stage_templates?.map(st => (
                <option key={st.id} value={st.id}>{st.stage_name}</option>
              ))}
            </select>

            <div style={{display: 'flex', gap: 10}}>
              <input style={s.input} type="number" step="0.01" placeholder="К-во" required
                value={pmForm.quantity} onChange={e => setPmForm({...pmForm, quantity: e.target.value})} />
              <button style={s.addBtnFull} type="submit">{t('admin.products.bindMaterial')}</button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

const s = {
  page: { padding: '32px' },
  header: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 },
  backBtn: { background: '#f3f4f6', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  content: { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 30, alignItems: 'start' },
  section: { background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  sectionTitle: { marginTop: 0, marginBottom: 20, fontSize: 16, color: '#4b5563' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 8px', fontSize: 13, color: '#9ca3af', borderBottom: '1px solid #f3f4f6' },
  td: { padding: '12px 8px', fontSize: 14, borderBottom: '1px solid #f3f4f6' },
  tr: { transition: '0.2s' },
  delBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 },
  badge: { background: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 },

  // Формы
  inlineForm: { display: 'flex', gap: 10, marginTop: 20 },
  materialForm: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 },
  select: { padding: '10px', borderRadius: 8, border: '1px solid #ddd', flex: 1 },
  input: { padding: '10px', borderRadius: 8, border: '1px solid #ddd' },
  addBtn: { background: '#6366f1', color: '#fff', border: 'none', width: 40, borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  addBtnFull: { background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, flex: 1 }
};