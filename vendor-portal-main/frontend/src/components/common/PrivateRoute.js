import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wraps protected routes.
 * - Waits for auth to initialise (avoids flash redirect on page refresh).
 * - Redirects to /login if no authenticated user.
 * - If requiredRole is supplied, redirects to / if user's role doesn't match.
 *   NOTE: A null/undefined role is treated as "no match" — not a bypass.
 */
const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still initialising — show spinner to avoid flash redirect
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No authenticated user after init — redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role guard — null/undefined role always fails the check (no bypass via missing role)
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to the correct portal root based on actual role
    const roleHome = user.role === 'admin'
      ? '/admin'
      : user.role === 'vendor'
        ? '/vendor'
        : user.role === 'manufacturer'
          ? '/manufacturer'
          : '/';
    return <Navigate to={roleHome} replace />;
  }

  return children;
};

export default PrivateRoute;
