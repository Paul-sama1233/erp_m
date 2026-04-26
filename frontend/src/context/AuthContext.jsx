import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = 'http://127.0.0.1:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // При загрузке страницы — восстанавливаем пользователя из токена
  useEffect(() => {
    if (token) {
      axios.get(`${API}/api/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setUser(res.data))
        .catch(() => logout())   // токен протух — разлогиниваем
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    // 1. Получаем токен
    const { data } = await axios.post(`${API}/api/token/`, { username, password });
    localStorage.setItem('token', data.access);
    localStorage.setItem('refresh', data.refresh);
    setToken(data.access);

    // 2. Получаем данные пользователя
    const me = await axios.get(`${API}/api/me/`, {
      headers: { Authorization: `Bearer ${data.access}` }
    });
    setUser(me.data);

    return me.data; // вернём роль для редиректа
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    setToken(null);
    setUser(null);
  };

  // Axios interceptor — автоматически добавляет токен ко всем запросам
  useEffect(() => {
    const id = axios.interceptors.request.use(config => {
      const t = localStorage.getItem('token');
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
    return () => axios.interceptors.request.eject(id);
  }, []);

  return (
    <AuthContext.Provider value={{ user,setUser, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);