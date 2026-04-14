import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wraps protected routes.
 * - Waits for auth to initialise (avoids flash redirect on page refresh).
 * - Redirects to /login if no token present.
 * - If requiredRole is supplied, redirects to / if user's role doesn't match.
 *
 * The user object shape after login:
 *   { access_token, user_id, org_id, role, org_type, full_name, email }  (portal login)
 *   { access_token, admin_id, role: 'admin', name, email }                (admin login)
 *   { id, org_id, role_id, first_name, last_name, email, ... }            (after page refresh via /auth/me)
 */
const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still initialising — show nothing to avoid flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No session — redirect to login, preserving intended destination
  if (!user && !localStorage.getItem('token')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check (optional) — use 'role' from login payload if available
  if (requiredRole && user) {
    const userRole = user.role || null; // present from login; may be absent after /auth/me refresh
    if (userRole && userRole !== requiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
