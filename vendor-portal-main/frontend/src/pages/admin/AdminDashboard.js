import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { FileText, ShieldCheck, Package, ShoppingCart } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ vendorPending: 0, vendorTotal: 0, mfgPending: 0, mfgTotal: 0, admins: 0, orders: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const orgsRes = await apiClient.get('/organizations/pending-applications');
        const orgs    = orgsRes?.data || [];
        const vendors = orgs.filter(o => o.org_type === 'manufacturer');
        const mfgs    = orgs.filter(o => o.org_type === 'customer');
        setStats({
          vendorTotal:   vendors.length,
          vendorPending: vendors.filter(o => o.verification_status === 'pending').length,
          mfgTotal:      mfgs.length,
          mfgPending:    mfgs.filter(o => o.verification_status === 'pending').length,
          orders: 0,
        });
      } catch { /* show zeros */ }
    };
    load();
  }, []);

  const cards = [
    { label: 'Vendor Applications', value: stats.vendorTotal, pending: stats.vendorPending, icon: FileText,      to: '/admin/vendor-apps',        color: 'bg-blue-50 text-blue-600' },
    { label: 'Manufacturer Apps',   value: stats.mfgTotal,    pending: stats.mfgPending,   icon: FileText,      to: '/admin/manufacturer-apps',  color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Admin Dashboard</h1>
        <p className="text-sm text-brand-400 mt-1">Platform overview</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, pending, icon: Icon, to, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}><Icon size={18} /></div>
              <span className="text-sm font-medium text-brand-600">{label}</span>
            </div>
            <p className="text-3xl font-display font-bold text-brand-900">{value}</p>
            {pending !== undefined && <p className="text-xs text-orange-500 mt-1">{pending} pending</p>}
            {to && <Link to={to} className="text-xs text-brand-500 hover:text-brand-700 mt-2 inline-block">View all →</Link>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
