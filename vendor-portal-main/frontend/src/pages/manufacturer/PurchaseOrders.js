import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import StatusBadge from '../../components/common/StatusBadge';
import DetailDrawer from '../../components/common/DetailDrawer';
import Pagination from '../../components/common/Pagination';
import Toast from '../../components/common/Toast';
import RatingModal from '../../components/common/RatingModal';
import { FileText, ExternalLink, Star, ChevronRight } from 'lucide-react';
import { toAbsUrl } from '../../utils/url';
import { getProductSummary } from '../../utils/orderUtils';

const PAGE_SIZE = 15;

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders]       = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ratingOrder, setRatingOrder]     = useState(null);
  const [ratedOrders, setRatedOrders]     = useState(new Set());
  const [toast, setToast]         = useState(null);
  const [page, setPage]           = useState(1);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await orderService.listOrders();
        setOrders(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load orders', type: 'error' });
      }
    };
    loadOrders();
  }, []); // eslint-disable-line

  const paginated = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Drawer Content ────────────────────────────────────────────────
  const DrawerContent = ({ o }) => {
    const isCompleted = o.status === 'delivered' || o.status === 'completed';
    const isRated     = ratedOrders.has(o.id);

    return (
      <div className="space-y-5 text-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
          <div>
            <p className="font-mono text-xs text-brand-400 mb-0.5">{o.order_number}</p>
            <p className="font-bold text-brand-900">{getProductSummary(o)}</p>
          </div>
          <StatusBadge status={o.status} />
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            ['Vendor Org',    o.customer_org_code  || `Org #${o.customer_org_id}`],
            ['Amount',        `₹${parseFloat(o.total_amount||0).toLocaleString('en-IN')}`],
            ['Priority',      o.priority],
            ['Date',          o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'],
            ['Expected Delivery', o.expected_delivery_date || '—'],
          ].filter(([,v])=>v&&v!=='—').map(([label,val])=>(
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">{label}</dt>
              <dd className="font-medium text-brand-800">{val}</dd>
            </div>
          ))}
          {o.delivery_address && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">Delivery Address</dt>
              <dd className="font-medium text-brand-800 whitespace-pre-line">{o.delivery_address}</dd>
            </div>
          )}
          {o.notes && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">Notes</dt>
              <dd className="text-brand-700">{o.notes}</dd>
            </div>
          )}
          {o.vendor_response_reason && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">Rejection Reason</dt>
              <dd className="font-medium text-red-700">{o.vendor_response_reason}</dd>
            </div>
          )}
        </dl>

        {/* Line items */}
        {o.items && o.items.length > 0 && (
          <div>
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3 pb-2 border-b border-surface-200">
              Line Items ({o.items.length})
            </p>
            <div className="bg-surface-50 border border-surface-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-surface-100 text-brand-500 border-b border-surface-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Product</th>
                    <th className="px-3 py-2 text-left font-semibold">Qty</th>
                    <th className="px-3 py-2 text-left font-semibold">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {o.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium text-brand-800">{item.product_name || `Product #${item.product_id}`}</td>
                      <td className="px-3 py-2 text-brand-600">{item.quantity} {item.unit || ''}</td>
                      <td className="px-3 py-2 text-brand-600">₹{parseFloat(item.unit_price||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PO Document */}
        {o.po_document_url && (
          <a
            href={toAbsUrl(o.po_document_url)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-surface-50 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-brand-700"><FileText size={15} />PO Document</span>
            <ExternalLink size={14} className="text-brand-400" />
          </a>
        )}

        {/* Rate Vendor */}
        {isCompleted && !isRated && (
          <div className="pt-4 border-t border-surface-200">
            <button
              onClick={() => { setSelectedOrder(null); setRatingOrder(o); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 border border-amber-200 w-full justify-center"
            >
              <Star size={15} /> Rate Vendor
            </button>
          </div>
        )}
      </div>
    );
  };

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
              <tr className="bg-surface-100 text-brand-600 text-xs font-semibold uppercase tracking-wide border-b border-surface-200">
                <th className="text-left px-5 py-3.5 min-w-[200px]">Product Overview</th>
                <th className="text-left px-5 py-3.5">Order ID</th>
                <th className="text-left px-5 py-3.5">Vendor Org</th>
                <th className="text-left px-5 py-3.5">Amount</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-left px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {paginated.map(o => (
                <tr key={o.id} onClick={() => setSelectedOrder(o)} className="row-clickable border-l-2 border-transparent hover:border-l-brand-500">
                  <td className="px-5 py-4 font-semibold text-brand-900">{getProductSummary(o)}</td>
                  <td className="px-5 py-4 font-mono text-xs text-brand-500">{o.order_number}</td>
                  <td className="px-5 py-4 font-medium text-brand-800">{o.customer_org_code || `Org #${o.customer_org_id}`}</td>
                  <td className="px-5 py-4 font-medium text-brand-700">₹{parseFloat(o.total_amount||0).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-4 text-brand-400 text-xs">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-4 text-brand-300"><ChevronRight size={16} /></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-brand-400">No orders yet. Browse products to place orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={orders.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? getProductSummary(selectedOrder) : 'Order Details'}
        subtitle={selectedOrder?.order_number}
      >
        {selectedOrder && <DrawerContent o={selectedOrder} />}
      </DetailDrawer>

      {/* Rating Modal */}
      <RatingModal
        open={!!ratingOrder}
        onClose={() => setRatingOrder(null)}
        order={ratingOrder}
        onRatingSuccess={(orderId) => {
          setRatedOrders(prev => new Set([...prev, orderId]));
          setToast({ message: 'Rating submitted successfully!', type: 'success' });
        }}
      />
    </div>
  );
};

export default PurchaseOrders;
