import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

// Keys stored in localStorage to survive page refresh
const SESSION_KEY = 'vh_session'; // { role, org_id, org_type, full_name, email }

const saveSession = (data) => {
  try {
    const role = data.role === 'superadmin' ? 'admin' : data.role;
    const access_level = data.access_level !== undefined 
      ? data.access_level 
      : (data.role === 'superadmin' ? 2 : (data.role === 'admin' ? 1 : 0));

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      role,
      org_id:       data.org_id,
      org_type:     data.org_type,
      full_name:    data.full_name || data.name,
      email:        data.email,
      user_id:      data.user_id || data.id || data.admin_id,
      access_level,
    }));
  } catch (_) { /* storage unavailable */ }
};

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem(SESSION_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    const token   = localStorage.getItem('token');
    const session = loadSession(); // role, org_id, org_type persisted at login

    if (!token) {
      setLoading(false);
      return;
    }

    // If token exists but session metadata is gone (partial localStorage clear),
    // we can't determine the user's role safely — force clean re-login.
    if (!session) {
      localStorage.removeItem('token');
      setLoading(false);
      return;
    }

    // Optimistic: show stored session immediately so UI doesn't flash
    setUser(session);

    // Admins have type:'admin' tokens — /auth/me rejects them with 401.
    // For admins/superadmins, trust the stored session and skip /auth/me.
    if (session.role === 'admin' || session.role === 'superadmin') {
      setLoading(false);
      return;
    }

    try {
      // Regular users: verify token is still valid via /auth/me
      const result = await authService.getCurrentUser();
      if (result && result.data) {
        const merged = {
          ...session,        // role, org_type — always preserve from session
          ...result.data,    // id, org_id, first_name, last_name, email, is_active
          role:     session.role,      // role MUST come from session (not /auth/me)
          org_type: session.org_type,  // org_type MUST come from session
        };
        setUser(merged);
        saveSession(merged);
      }
    } catch (error) {
      // 401 or network error — clear everything
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { initAuth(); }, [initAuth]);

  const login = async (email, password) => {
    try {
      const result = await authService.login(email, password);
      if (result && result.data && result.data.access_token) {
        const userData = result.data;
        saveSession(userData);   // persist role, org_id, org_type, full_name
        
        // Normalize role and ensure access_level in state to match localStorage persistence
        const sessionUser = {
          ...userData,
          role: userData.role === 'superadmin' ? 'admin' : userData.role,
          access_level: userData.access_level ?? (userData.role === 'superadmin' ? 2 : (userData.role === 'admin' ? 1 : 0))
        };
        setUser(sessionUser);
        return { success: true, user: sessionUser };
      }
      return { success: false, message: result?.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const logout = () => {
    clearSession();
    authService.logout(); // clears token via the service as well
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
