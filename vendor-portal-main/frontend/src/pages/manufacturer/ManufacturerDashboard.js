import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import Toast from '../../components/common/Toast';
import { Search, ShoppingCart, Truck, Package, ArrowRight } from 'lucide-react';

const ManufacturerDashboard = () => {
  const { user } = useAuth();
  const [allProducts, setAllProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, orderRes] = await Promise.all([
          productService.listProducts(),
          orderService.listOrders()
        ]);
        setAllProducts(prodRes?.data || []);
        setOrders(orderRes?.data || []);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load dashboard data', type: 'error' });
      }
    };
    loadData();
  }, [user.email]);

  const activeOrders = orders.filter(o => !['delivered', 'rejected'].includes(o.status));

  const cards = [
    { label: 'Available Products', value: allProducts.length, icon: Package, to: '/manufacturer/browse', color: 'bg-blue-50 text-blue-600' },
    { label: 'My Orders', value: orders.length, icon: ShoppingCart, to: '/manufacturer/orders', color: 'bg-purple-50 text-purple-600' },
    { label: 'In Transit', value: activeOrders.length, icon: Truck, to: '/manufacturer/tracking', color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Welcome back, {user.name || 'Manufacturer'}</h1>
        <p className="text-sm text-brand-400 mt-1">Browse products and manage your orders.</p>
      </div>

      {/* Search bar */}
      <div className="card p-4">
        <Link to="/manufacturer/browse" className="flex items-center gap-3 px-4 py-3 bg-surface-100 rounded-lg text-brand-400 hover:bg-surface-200 transition-colors">
          <Search size={18} />
          <span className="text-sm">Search products or vendors...</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <Link key={i} to={c.to} className="card p-5 hover:shadow-elevated transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon size={18} />
              </div>
              <ArrowRight size={16} className="text-brand-300 group-hover:text-brand-600 transition-colors" />
            </div>
            <p className="font-display font-bold text-2xl text-brand-900">{c.value}</p>
            <p className="text-sm text-brand-400">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-200">
          <h2 className="font-display font-semibold text-brand-900">Recent Orders</h2>
        </div>
        <div className="divide-y divide-surface-200">
          {orders.slice(0, 5).map(o => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-800">{o.productName}</p>
                <p className="text-xs text-brand-400">Vendor: {o.vendorEmail} • Qty: {o.quantity}</p>
              </div>
              <span className={`badge badge-${o.status}`}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-brand-400">No orders yet. Browse products to get started.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManufacturerDashboard;
