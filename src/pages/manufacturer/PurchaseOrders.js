import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOrders } from '../../utils/storage';
import StatusBadge from '../../components/common/StatusBadge';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders(getOrders({ manufacturerEmail: user.email }));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Purchase Orders</h1>
        <p className="text-sm text-brand-400 mt-1">All orders you've placed with vendors.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 text-brand-600">
                <th className="text-left px-5 py-3 font-medium">Order ID</th>
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-left px-5 py-3 font-medium">Vendor</th>
                <th className="text-left px-5 py-3 font-medium">Qty</th>

                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-brand-500">{o.id}</td>
                  <td className="px-5 py-3 font-medium text-brand-800">{o.productName}</td>
                  <td className="px-5 py-3 text-brand-500">{o.vendorName || o.vendorEmail}</td>
                  <td className="px-5 py-3 text-brand-600">{o.quantity}</td>

                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-brand-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">No orders yet. Browse products to place orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;
