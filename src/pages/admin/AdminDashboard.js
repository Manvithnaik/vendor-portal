import React from 'react';
import { Link } from 'react-router-dom';
import { getApplications, getAdmins, getProducts, getOrders } from '../../utils/storage';
import { FileText, ShieldCheck, Package, ShoppingCart, ArrowRight } from 'lucide-react';

const AdminDashboard = () => {
  const vendorApps = getApplications('vendor');
  const mfgApps = getApplications('manufacturer');
  const admins = getAdmins();
  const orders = getOrders();

  const cards = [
    { label: 'Vendor Applications', value: vendorApps.length, pending: vendorApps.filter(a => a.status === 'pending').length, icon: FileText, to: '/admin/vendor-apps', color: 'bg-blue-50 text-blue-600' },
    { label: 'Manufacturer Applications', value: mfgApps.length, pending: mfgApps.filter(a => a.status === 'pending').length, icon: FileText, to: '/admin/manufacturer-apps', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Admins', value: admins.length, icon: ShieldCheck, to: '/admin/manage-admins', color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Admin Dashboard</h1>
        <p className="text-sm text-brand-400 mt-1">Manage applications, admins, and monitor activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="card p-5 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon size={18} />
              </div>
              {c.to && (
                <Link to={c.to} className="text-brand-400 hover:text-brand-600">
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
            <p className="font-display font-bold text-2xl text-brand-900">{c.value}</p>
            <p className="text-sm text-brand-400">{c.label}</p>
            {c.pending !== undefined && c.pending > 0 && (
              <p className="text-xs text-yellow-600 mt-1">{c.pending} pending review</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent pending applications */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="font-display font-semibold text-brand-900">Recent Pending Applications</h2>
        </div>
        <div className="divide-y divide-surface-200">
          {[...vendorApps, ...mfgApps]
            .filter(a => a.status === 'pending')
            .slice(0, 5)
            .map(app => (
              <div key={app.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-800">{app.orgName}</p>
                  <p className="text-xs text-brand-400">{app.email} • {app.role}</p>
                </div>
                <span className="badge badge-pending">Pending</span>
              </div>
            ))}
          {[...vendorApps, ...mfgApps].filter(a => a.status === 'pending').length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-brand-400">No pending applications.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
