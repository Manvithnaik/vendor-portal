import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProducts, getOrders } from '../../utils/storage';
import { Package, ShoppingCart, Truck, ArrowRight } from 'lucide-react';

const VendorDashboard = () => {
  const { user } = useAuth();
  const products = getProducts(user.email);
  const orders = getOrders({ vendorEmail: user.email });
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const shipped = orders.filter(o => o.status === 'shipped');

  const cards = [
    { label: 'My Products', value: products.length, icon: Package, to: '/vendor/products', color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Orders', value: pendingOrders.length, icon: ShoppingCart, to: '/vendor/orders', color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Shipped', value: shipped.length, icon: Truck, to: '/vendor/shipping', color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Welcome back, {user.name || 'Vendor'}</h1>
        <p className="text-sm text-brand-400 mt-1">Here's an overview of your account.</p>
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
                <p className="text-xs text-brand-400">from {o.manufacturerEmail} • Qty: {o.quantity}</p>
              </div>
              <span className={`badge badge-${o.status}`}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-brand-400">No orders yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
