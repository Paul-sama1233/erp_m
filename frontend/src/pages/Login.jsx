import React, { useState, useEffect } from 'react'; // Добавили useEffect в импорт
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#171717";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.backgroundColor = "";
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) navigate('/');
    else alert('Неверный логин или пароль');
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>Wallman</div>
        <h2 style={s.title}>Вход в систему</h2>
        <p style={s.subtitle}>Управляйте производством эффективно</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Логин</label>
            <input
              style={s.input}
              type="text"
              placeholder="Введите ваш логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Пароль</label>
            <input
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" style={s.button}>Войти</button>
        </form>
      </div>
    </div>
  );
}

const s = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#171717',
    margin: 0,
    padding: 0
  },
  card: {
    background: '#ffffff',
    padding: '48px 40px',
    borderRadius: '28px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
  },
  logo: {
    fontFamily: 'serif',
    fontSize: '32px',
    fontWeight: '800',
    color: '#1e1b4b',
    marginBottom: '10px'
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '36px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    textAlign: 'left'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569'
  },
  input: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '15px',
    outline: 'none',
    background: '#fff'
  },
  button: {
    padding: '16px',
    borderRadius: '14px',
    border: 'none',
    background: '#bef264',
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 4px 15px rgba(190, 242, 100, 0.3)',
    transition: '0.2s'
  }
};