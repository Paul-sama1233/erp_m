import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://127.0.0.1:8001/api/token/', {
        username,
        password,
      });
      const access = res.data.access;
      localStorage.setItem('access_token', access);
      setToken(access);

      const me = await axios.get('http://127.0.0.1:8001/api/me/', {
        headers: { Authorization: `Bearer ${access}` },
      });
      setUser(me.data);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  // Автоматически подгружаем данные пользователя при перезагрузке
  useEffect(() => {
    if (token) {
      axios.get('http://127.0.0.1:8001/api/me/', {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => setUser(res.data)).catch(() => logout());
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);