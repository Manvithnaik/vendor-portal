import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { FileText, ShieldCheck, Package, ShoppingCart } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ 
    vendorPending: 0, 
    vendorTotal: 0, 
    vendorAccepted: 0,
    mfgPending: 0, 
    mfgTotal: 0, 
    mfgAccepted: 0,
    adminsCount: 0 
  });

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch organizations from both pending and reviewed endpoints to get full picture
        const [pendingRes, reviewedRes] = await Promise.all([
          apiClient.get('/organizations/pending-applications'),
          apiClient.get('/organizations/admin/reviewed')
        ]);
        
        const orgs = [...(pendingRes?.data || []), ...(reviewedRes?.data || [])];
        
        const vendors = orgs.filter(o => o.org_type === 'manufacturer');
        const mfgs = orgs.filter(o => o.org_type === 'customer');

        // Fetch admins and filter for access_level === 1 (Regular Admins)
        let regularAdminsCount = 0;
        try {
          const adminsRes = await apiClient.get('/admin/admins');
          const admins = adminsRes?.data || [];
          // Count admins with access_level === 1 to match Management page
          regularAdminsCount = admins.filter(a => a.access_level === 1).length;
        } catch (e) {
          console.error("Failed to fetch admins", e);
        }

        setStats({
          vendorTotal: vendors.length,
          vendorPending: vendors.filter(o => o.verification_status === 'pending').length,
          // Count 'verified' or 'approved' as per requirement
          vendorAccepted: vendors.filter(o => o.verification_status === 'verified' || o.verification_status === 'approved').length,
          
          mfgTotal: mfgs.length,
          mfgPending: mfgs.filter(o => o.verification_status === 'pending').length,
          // Count 'verified' or 'approved' as per requirement
          mfgAccepted: mfgs.filter(o => o.verification_status === 'verified' || o.verification_status === 'approved').length,
          
          adminsCount: regularAdminsCount
        });
      } catch (err) {
        console.error("Dashboard load failed", err);
      }
    };
    load();
  }, []);

  const cards = [
    { label: 'Vendor Applications', value: stats.vendorTotal, pending: stats.vendorPending, icon: FileText, to: '/admin/vendor-apps', color: 'bg-blue-50 text-blue-600' },
    { label: 'Manufacturer Applications', value: stats.mfgTotal, pending: stats.mfgPending, icon: FileText, to: '/admin/manufacturer-apps', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Accepted Vendors', value: stats.vendorAccepted, icon: ShieldCheck, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Accepted Manufacturers', value: stats.mfgAccepted, icon: ShieldCheck, color: 'bg-purple-50 text-purple-600' },
    { label: 'Active Admins', value: stats.adminsCount, icon: ShieldCheck, color: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Superadmin Dashboard</h1>
        <p className="text-sm text-brand-400 mt-1">Platform overview and system metrics</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, value, pending, icon: Icon, to, color }) => (
          <div key={label} className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}><Icon size={18} /></div>
                <span className="text-sm font-medium text-brand-600">{label}</span>
              </div>
              <p className="text-3xl font-display font-bold text-brand-900">{value}</p>
              {pending !== undefined && <p className="text-xs text-orange-500 mt-1 font-medium">{pending} pending approval</p>}
            </div>
            {to && (
              <Link to={to} className="text-xs text-brand-500 hover:text-brand-700 mt-4 font-medium flex items-center gap-1 group w-fit">
                <span>View details</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
