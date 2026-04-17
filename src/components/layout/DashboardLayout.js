import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = ({ role }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;

  return (
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar role={role} />
      <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
