import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';
import { Truck } from 'lucide-react';

const VendorShipping = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [loadingOrderId, setLoadingOrderId] = useState(null);

  const load = async () => {
    try {
      const response = await apiClient.get('/shipping/orders');
      console.log('Shipping Orders API Response:', response);
      setOrders(response?.data || []);
    } catch (e) {
      setToast({ message: e.message || 'Failed to load orders', type: 'error' });
    }
  };
  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id) => {
    setLoadingOrderId(id);
    try {
      const response = await apiClient.put(`/shipping/update-status/${id}`);
      console.log('Update Status API Response:', response);
      const updatedOrder = response?.data || {};
      
      setToast({ message: `Status updated successfully.`, type: 'success' });
      
      // Instantly update the local UI without a full reload to make it fast
      setOrders(orders.map(o => o.id === id ? { ...o, status: updatedOrder.status || o.status } : o));
      
      // Also fetch in background to ensure sync
      load();
    } catch (e) {
      setToast({ message: e.message || 'Failed to update status', type: 'error' });
    } finally {
      setLoadingOrderId(null);
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
                  <td className="px-5 py-3 font-mono text-xs text-brand-500">{o.order_number || o.id}</td>
                  <td className="px-5 py-3 font-medium text-brand-800">{o.product_name}</td>
                  <td className="px-5 py-3 text-brand-500">{o.customer_name}</td>
                  <td className="px-5 py-3 text-brand-600">{o.quantity}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {o.status === 'accepted' && (
                        <button 
                          onClick={() => handleStatusChange(o.id)} 
                          disabled={loadingOrderId === o.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${loadingOrderId === o.id ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                        >
                          <Truck size={13} /> {loadingOrderId === o.id ? 'Updating...' : 'Mark as Shipped'}
                        </button>
                      )}
                      {o.status === 'shipped' && (
                        <button 
                          onClick={() => handleStatusChange(o.id)} 
                          disabled={loadingOrderId === o.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${loadingOrderId === o.id ? 'bg-orange-100 text-orange-400 cursor-not-allowed' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                        >
                          {loadingOrderId === o.id ? 'Updating...' : 'Mark as Delivered'}
                        </button>
                      )}
                      {o.status === 'delivered' && (
                        <button 
                          disabled
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          Completed
                        </button>
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
