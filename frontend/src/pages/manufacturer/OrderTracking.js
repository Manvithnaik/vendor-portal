import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import Toast from '../../components/common/Toast';
import { Package, CheckCircle, Truck, MapPin, Clock } from 'lucide-react';

const trackSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

const statusOrder = { pending: 0, accepted: 1, shipped: 2, delivered: 3, rejected: -1 };

const OrderTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await orderService.listOrders();
        const all = response?.data || [];
        setOrders(all.filter(o => o.status !== 'rejected'));
      } catch (err) {
        setToast({ message: err.message || 'Failed to load orders', type: 'error' });
      }
    };
    loadOrders();
  }, [user.email]);

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Order Tracking</h1>
        <p className="text-sm text-brand-400 mt-1">Track the status of your orders in real-time.</p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map(o => {
            const currentStep = statusOrder[o.status] ?? 0;
            return (
              <div key={o.id} className="card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
                  <div>
                    <h3 className="font-medium text-brand-900">{o.productName}</h3>
                    <p className="text-xs text-brand-400">
                      Order {o.id} • Vendor: {o.vendorName || o.vendorEmail} • Qty: {o.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-display font-bold text-accent-600">
                    ${(o.productPrice * o.quantity).toFixed(2)}
                  </p>
                </div>

                {/* Tracker */}
                <div className="flex items-center gap-0 w-full">
                  {trackSteps.map((step, i) => {
                    const reached = i <= currentStep;
                    const isActive = i === currentStep;
                    const isLast = i === trackSteps.length - 1;
                    const Icon = step.icon;
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            reached
                              ? isActive
                                ? 'bg-accent-500 text-white shadow-sm ring-4 ring-accent-100'
                                : 'bg-accent-500 text-white'
                              : 'bg-surface-200 text-brand-400'
                          }`}>
                            <Icon size={14} />
                          </div>
                          <span className={`text-xs font-medium whitespace-nowrap ${reached ? 'text-brand-700' : 'text-brand-300'}`}>
                            {step.label}
                          </span>
                        </div>
                        {!isLast && (
                          <div className={`flex-1 h-0.5 mx-1.5 rounded transition-all ${
                            i < currentStep ? 'bg-accent-400' : 'bg-surface-200'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Package size={40} className="text-brand-200 mx-auto mb-3" />
          <p className="text-brand-400">No active orders to track.</p>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
