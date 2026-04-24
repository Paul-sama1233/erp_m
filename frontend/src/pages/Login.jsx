import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      // Редирект по роли
      if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/worker/dashboard');
    } catch {
      setError('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Wallman ERP</h2>
        <p style={styles.subtitle}>Войдите в систему</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Логин</label>
            <input
              style={styles.input}
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="Введите логин"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input
              style={styles.input}
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Введите пароль"
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#f0f2f5',
  },
  card: {
    background: '#fff', padding: '40px',
    borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    width: '100%', maxWidth: '400px',
  },
  title:    { margin: 0, fontSize: '24px', fontWeight: 700, color: '#1a1a2e' },
  subtitle: { color: '#888', marginBottom: '28px' },
  field:    { marginBottom: '16px' },
  label:    { display: 'block', marginBottom: '6px', fontWeight: 500, color: '#444' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box',
    outline: 'none',
  },
  button: {
    width: '100%', padding: '12px', borderRadius: '8px',
    background: '#4f46e5', color: '#fff', border: 'none',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginTop: '8px',
  },
  error: { color: '#e53e3e', fontSize: '14px', marginBottom: '8px' },
};