import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as doLogout, login as doLogin } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setUser(u);
    setLoading(false);
  }, []);

  const login = (email, password, role) => {
    const result = doLogin(email, password, role);
    if (result.success) setUser(result.user);
    return result;
  };

  const logout = () => {
    doLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
