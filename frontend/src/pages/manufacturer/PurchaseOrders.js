import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOrders } from '../../utils/storage';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { Eye, FileText, Download } from 'lucide-react';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);

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
                <th className="text-right px-5 py-3 font-medium">Actions</th>
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
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setViewOrder(o)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View Details">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-brand-400">No orders yet. Browse products to place orders.</td></tr>
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
                ['Order ID', viewOrder.id],
                ['Product', viewOrder.productName],
                ['Vendor', viewOrder.vendorName || viewOrder.vendorEmail],
                ['Quantity', viewOrder.quantity],
                ['Status', viewOrder.status],
                ['Date', new Date(viewOrder.createdAt).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-brand-400">{label}</dt>
                  <dd className="font-medium text-brand-800">{val || '—'}</dd>
                </div>
              ))}
              {viewOrder.deliveryAddress && (
                <div className="sm:col-span-2">
                  <dt className="text-brand-400">Delivery Address</dt>
                  <dd className="font-medium text-brand-800 whitespace-pre-line">{viewOrder.deliveryAddress}</dd>
                </div>
              )}
              {viewOrder.deliveryDate && (
                <div>
                  <dt className="text-brand-400">Expected Delivery</dt>
                  <dd className="font-medium text-brand-800">{viewOrder.deliveryDate}</dd>
                </div>
              )}
              {viewOrder.poNotes && (
                <div className="sm:col-span-2">
                  <dt className="text-brand-400">Notes</dt>
                  <dd className="font-medium text-brand-800">{viewOrder.poNotes}</dd>
                </div>
              )}
              {viewOrder.rejectionReason && (
                <div className="sm:col-span-2">
                  <dt className="text-brand-400">Rejection Reason</dt>
                  <dd className="font-medium text-red-700">{viewOrder.rejectionReason}</dd>
                </div>
              )}
            </dl>
            {viewOrder.poFileData && (
              <div className="border-t border-surface-200 pt-4">
                <p className="text-sm font-semibold text-brand-700 mb-2">Purchase Order Document</p>
                <div className="flex items-center gap-2 text-sm text-brand-600 mb-2">
                  <FileText size={14} /> {viewOrder.poFileName}
                </div>
                <iframe src={viewOrder.poFileData} title="PO Document" className="w-full h-64 border border-surface-200 rounded-lg" />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => { const w = window.open(); if (w) w.document.write(`<iframe src="${viewOrder.poFileData}" style="width:100%;height:100vh;border:none;"></iframe>`); }} className="btn-secondary text-xs">
                    <Eye size={13} /> Open in New Tab
                  </button>
                  <button type="button" onClick={() => { const a = document.createElement('a'); a.href = viewOrder.poFileData; a.download = viewOrder.poFileName || 'po.pdf'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }} className="btn-secondary text-xs">
                    <Download size={13} /> Download
                  </button>
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
