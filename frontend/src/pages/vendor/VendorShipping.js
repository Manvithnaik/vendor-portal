import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';
import { Truck } from 'lucide-react';

const VendorShipping = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      const response = await orderService.listOrders();
      const all = response?.data || [];
      setOrders(all.filter(o => ['accepted', 'shipped', 'delivered'].includes(o.status)));
    } catch (e) {
      setToast({ message: e.message || 'Failed to load orders', type: 'error' });
    }
  };
  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      // Assuming a generic update or a specific shipping update endpoint
      await orderService.updateOrderStatus(id, newStatus);
      setToast({ message: `Status updated to ${newStatus}.`, type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.message || 'Failed to update status', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Shipping</h1>
        <p className="text-sm text-brand-400 mt-1">Update shipping status for accepted orders.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 text-brand-600">
                <th className="text-left px-5 py-3 font-medium">Order ID</th>
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-left px-5 py-3 font-medium">Manufacturer</th>
                <th className="text-left px-5 py-3 font-medium">Qty</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-brand-500">{o.id}</td>
                  <td className="px-5 py-3 font-medium text-brand-800">{o.productName}</td>
                  <td className="px-5 py-3 text-brand-500">{o.manufacturerEmail}</td>
                  <td className="px-5 py-3 text-brand-600">{o.quantity}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {o.status === 'accepted' && (
                        <button onClick={() => handleStatusChange(o.id, 'shipped')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                          <Truck size={13} /> Mark Shipped
                        </button>
                      )}
                      {o.status === 'shipped' && (
                        <button onClick={() => handleStatusChange(o.id, 'delivered')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                          Mark Delivered
                        </button>
                      )}
                      {o.status === 'delivered' && (
                        <span className="text-xs text-brand-400">Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">No shippable orders. Accept orders first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorShipping;
