import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import { Eye, FileText, ExternalLink } from 'lucide-react';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [viewOrder, setViewOrder] = useState(null);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        // orderService returns the inner payload array directly (after .data unwrap in service)
        const res = await orderService.listOrders();
        setOrders(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load orders', type: 'error' });
      }
    };
    loadOrders();
  }, []); // eslint-disable-line

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Purchase Orders</h1>
        <p className="text-sm text-brand-400 mt-1">All orders you've placed with vendors.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 text-brand-600">
                <th className="text-left px-5 py-3 font-medium">Order #</th>
                <th className="text-left px-5 py-3 font-medium">Vendor Org</th>
                <th className="text-left px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-brand-500">{o.order_number}</td>
                  <td className="px-5 py-3 font-medium text-brand-800">Org #{o.manufacturer_org_id}</td>
                  <td className="px-5 py-3 text-brand-600">
                    {o.currency} {parseFloat(o.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-brand-400">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setViewOrder(o)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View Details">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">No orders yet. Browse products to place orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Order Details">
        {viewOrder && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Order #',     viewOrder.order_number],
                ['Vendor Org',  `Org #${viewOrder.manufacturer_org_id}`],
                ['Amount',      `${viewOrder.currency} ${parseFloat(viewOrder.total_amount || 0).toLocaleString()}`],
                ['Status',      viewOrder.status],
                ['Priority',    viewOrder.priority],
                ['Date',        viewOrder.created_at ? new Date(viewOrder.created_at).toLocaleDateString() : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-brand-400">{label}</dt>
                  <dd className="font-medium text-brand-800">{val || '—'}</dd>
                </div>
              ))}
              {viewOrder.delivery_address && (
                <div className="col-span-2">
                  <dt className="text-brand-400">Delivery Address</dt>
                  <dd className="font-medium text-brand-800 whitespace-pre-line">{viewOrder.delivery_address}</dd>
                </div>
              )}
              {viewOrder.expected_delivery_date && (
                <div>
                  <dt className="text-brand-400">Expected Delivery</dt>
                  <dd className="font-medium text-brand-800">{viewOrder.expected_delivery_date}</dd>
                </div>
              )}
              {viewOrder.notes && (
                <div className="col-span-2">
                  <dt className="text-brand-400">Notes</dt>
                  <dd className="font-medium text-brand-800">{viewOrder.notes}</dd>
                </div>
              )}
              {viewOrder.vendor_response_reason && (
                <div className="col-span-2">
                  <dt className="text-brand-400">Rejection Reason</dt>
                  <dd className="font-medium text-red-700">{viewOrder.vendor_response_reason}</dd>
                </div>
              )}
            </dl>

            {viewOrder.po_document_url && (
              <div className="border-t border-surface-200 pt-4">
                <p className="text-sm font-semibold text-brand-700 mb-2">Purchase Order Document</p>
                <div className="flex items-center gap-2 text-sm text-brand-600 mb-2">
                  <FileText size={14} />
                  <a
                    href={viewOrder.po_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-600 hover:text-accent-700 font-medium inline-flex items-center gap-1"
                  >
                    <ExternalLink size={13} /> View PO Document
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrders;
