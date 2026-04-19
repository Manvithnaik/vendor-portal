import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { rfqService } from '../../services/rfqService';
import { quoteService } from '../../services/quoteService';

import {
  LayoutDashboard, Users, Package, ShoppingCart, Truck,
  UserCircle, Settings, LogOut, ChevronLeft, ChevronRight,
  FileText, ShieldCheck, Search, Menu, X, FileSearch, RotateCcw
} from 'lucide-react';

// Sidebar link items per role
const navItems = {
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/vendor-apps', icon: FileText, label: 'Vendor Applications' },
    { to: '/admin/manufacturer-apps', icon: FileText, label: 'Manufacturer Apps' },
    { to: '/admin/manage-admins', icon: ShieldCheck, label: 'Admin Management' },
  ],
  vendor: [
    { to: '/vendor', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/vendor/products', icon: Package, label: 'Products' },
    { to: '/vendor/orders', icon: ShoppingCart, label: 'Orders & RFQs' },
    { to: '/vendor/shipping', icon: Truck, label: 'Shipping' },
    { to: '/vendor/returns', icon: RotateCcw, label: 'Returns & Disputes' },
    { to: '/vendor/applications', icon: FileText, label: 'Applications' },
  ],
  manufacturer: [
    { to: '/manufacturer', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/manufacturer/browse', icon: Search, label: 'Browse Products' },
    { to: '/manufacturer/quotations', icon: FileSearch, label: 'Quotations' },
    { to: '/manufacturer/orders', icon: ShoppingCart, label: 'Purchase Orders' },
    { to: '/manufacturer/tracking', icon: Truck, label: 'Order Tracking' },
    { to: '/manufacturer/returns', icon: RotateCcw, label: 'Returns & Disputes' },
    { to: '/manufacturer/applications', icon: FileText, label: 'Applications' },
  ],
};

const Sidebar = ({ role }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasNewRFQs, setHasNewRFQs] = useState(false);
  const [hasNewQuotes, setHasNewQuotes] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Filter items based on access_level for admins
  let items = navItems[role] || [];
  if (role === 'admin' && user?.access_level < 2) {
    items = items.filter(item => item.to !== '/admin/manage-admins');
  }
  const visibleItems = items.filter(item => item.label !== 'Profile');

  // Backend polling for unseen RFQs can be implemented here later
  useEffect(() => {
    let interval;
    if (role === 'vendor' && user?.email) {
      const checkRFQs = async () => {
         try {
            const rfqRes = await rfqService.listRFQs();
            const rfqs = Array.isArray(rfqRes?.data) ? rfqRes.data : [];
            const activeCount = rfqs.filter(r => r.status === 'active' || r.status === 'extended').length;
            const lastSeen = parseInt(localStorage.getItem(`lastSeenRFQCount_${user.email}`) || '0', 10);
            if (activeCount > lastSeen) {
               setHasNewRFQs(true);
            } else {
               setHasNewRFQs(false);
            }
         } catch (e) {
            // ignore
         }
      };
      
      const handleRead = () => setHasNewRFQs(false);
      window.addEventListener('rfqRead', handleRead);

      checkRFQs();
      interval = setInterval(checkRFQs, 30000);
      
      return () => {
         window.removeEventListener('rfqRead', handleRead);
         clearInterval(interval);
      };
    }
  }, [role, user?.email, location.pathname]);

  // Backend polling for unseen quotations for manufacturers
  useEffect(() => {
    let interval;
    if (role === 'manufacturer' && user?.email) {
      const checkQuotes = async () => {
         try {
            const rfqRes = await rfqService.listRFQs();
            const rfqs = Array.isArray(rfqRes?.data) ? rfqRes.data : [];
            const activeRFQs = rfqs.filter(r => r.status === 'active' || r.status === 'extended');
            
            let totalQuotes = 0;
            await Promise.all(activeRFQs.map(async (rfq) => {
               try {
                  const qRes = await quoteService.listQuotes(rfq.id);
                  if (qRes && Array.isArray(qRes.data)) {
                     totalQuotes += qRes.data.length;
                  }
               } catch(e) {}
            }));
            
            const lastSeen = parseInt(localStorage.getItem(`lastSeenQuoteCount_${user.email}`) || '0', 10);
            setHasNewQuotes(totalQuotes > lastSeen);
         } catch (e) {
            // ignore
         }
      };

      const handleRead = () => setHasNewQuotes(false);
      window.addEventListener('quoteRead', handleRead);

      checkQuotes();
      interval = setInterval(checkQuotes, 40000);

      return () => {
         window.removeEventListener('quoteRead', handleRead);
         clearInterval(interval);
      };
    }
  }, [role, user?.email]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-800 text-white shadow-sm'
        : 'text-brand-400 hover:text-brand-800 hover:bg-brand-50'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-surface-200">
        <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center">
          <span className="text-white font-display font-bold text-sm">V</span>
        </div>
        {!collapsed && <span className="font-display font-bold text-lg text-brand-900">VendorHub</span>}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={linkClasses}
            onClick={() => setMobileOpen(false)}
          >
            <div className="relative">
              <item.icon size={18} />
              {role === 'vendor' && item.to === '/vendor/orders' && hasNewRFQs && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
              {role === 'manufacturer' && item.to === '/manufacturer/quotations' && hasNewQuotes && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User & logout */}
      <div className="px-3 py-4 border-t border-surface-200 space-y-2">
        {user && role !== 'admin' && (
          <NavLink
            to={`/${role}/profile`}
            className={linkClasses}
            onClick={() => setMobileOpen(false)}
          >
            <UserCircle size={18} className="flex-shrink-0" />
            {!collapsed && (
              <div className="flex flex-col text-left overflow-hidden min-w-0 flex-1">
                <span className="font-medium truncate leading-tight">{user.name || 'Profile'}</span>
                <span className="text-[11px] truncate opacity-75 font-normal leading-tight mt-0.5">{user.email}</span>
              </div>
            )}
          </NavLink>
        )}
        {!collapsed && user && role === 'admin' && (
          <div className="px-3 py-2 text-xs text-brand-400">
            <p className="font-medium text-brand-700 truncate">{user.name || user.email}</p>
            <p className="capitalize">{user.role}</p>
          </div>
        )}
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger-500 hover:bg-danger-50 transition-all w-full">
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-elevated border border-surface-300"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-surface-300 z-50 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen bg-white border-r border-surface-300 sticky top-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-surface-300 rounded-full flex items-center justify-center shadow-sm hover:bg-brand-50 transition-all"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
