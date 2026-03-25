import { createContext, useContext, useState, useEffect } from 'react';
import { fetchMe, logout as apiLogout, devLogin as apiDevLogin } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const devLogin = async (username) => {
    const u = await apiDevLogin(username);
    setUser(u);
    return u;
  };

  const refreshUser = async () => {
    try {
      const u = await fetchMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, devLogin, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
