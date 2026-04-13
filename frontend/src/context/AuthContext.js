import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const result = await authService.getCurrentUser();
          if (result && result.data) {
            setUser(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch current user", error);
          authService.logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password, role) => {
    try {
      const result = await authService.login(email, password, role);
      // Backend standard response format { status: "success", data: { user: {...}, token: "..." } }
      if (result && result.data && result.data.user) {
        setUser(result.data.user);
        return { success: true, user: result.data.user };
      }
      return { success: false, message: result.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
