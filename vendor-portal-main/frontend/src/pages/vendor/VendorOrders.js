import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { rfqService } from '../../services/rfqService';
import { quoteService } from '../../services/quoteService';
import { orderService } from '../../services/orderService';
import { uploadService } from '../../services/uploadService';
import StatusBadge from '../../components/common/StatusBadge';
import DetailDrawer from '../../components/common/DetailDrawer';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import {
  CheckCircle, XCircle, FileText, Package,
  ShoppingCart, Clock, ExternalLink, ChevronRight
} from 'lucide-react';
import { toAbsUrl } from '../../utils/url';

// ── Tab ─────────────────────────────────────────────────────────────
const Tab = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active ? 'border-brand-800 text-brand-900' : 'border-transparent text-brand-400 hover:text-brand-700'
    }`}
  >
    <Icon size={15} />
    {label}
    {count > 0 && (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
        active ? 'bg-brand-800 text-white' : 'bg-brand-100 text-brand-600'
      }`}>{count}</span>
    )}
  </button>
);

// ── RFQ Status Badge ─────────────────────────────────────────────────
const RFQBadge = ({ status }) => {
  const map = { active:'bg-yellow-100 text-yellow-800', extended:'bg-blue-100 text-blue-700', draft:'bg-gray-100 text-gray-500', closed:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-500' };
  const label = { active:'Open', extended:'Extended', draft:'Draft', closed:'Closed', cancelled:'Cancelled' };
  return <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>{label[status] || status}</span>;
};

// ── VendorOrders ─────────────────────────────────────────────────────
const VendorOrders = () => {
  const { user } = useAuth();
  const [tab, setTab]         = useState('orders');
  const [orders, setOrders]   = useState([]);
  const [rfqs, setRfqs]       = useState([]);
  const [myQuotes, setMyQuotes] = useState([]);
  const [toast, setToast]     = useState(null);

  // Drawer state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRFQ, setSelectedRFQ]     = useState(null);

  // Reject reason
  const [rejectOrder, setRejectOrder]   = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Quote submit modal
  const [quoteRFQ, setQuoteRFQ]     = useState(null);
  const [quoteForm, setQuoteForm]   = useState({ price: '', lead_time_days: '', compliance_notes: '', document: null });
  const [quoteError, setQuoteError] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const load = async () => {
    try {
      const [orderRes, rfqRes, quoteRes] = await Promise.all([
        orderService.listOrders({ as_customer: false }),
        rfqService.listRFQs(),
        quoteService.myQuotes(),
      ]);
      setOrders(Array.isArray(orderRes?.data) ? orderRes.data : []);
      setRfqs(Array.isArray(rfqRes?.data)     ? rfqRes.data   : []);
      setMyQuotes(Array.isArray(quoteRes?.data) ? quoteRes.data : []);
    } catch (e) {
      setToast({ message: e.message || 'Failed to load data', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    if (tab === 'rfqs') {
      const activeRFQCount = rfqs.filter(r => r.status === 'active' || r.status === 'extended').length;
      localStorage.setItem(`lastSeenRFQCount_${user?.email}`, activeRFQCount.toString());
      window.dispatchEvent(new Event('rfqRead'));
    }
  }, [tab, rfqs, user?.email]);

  // ── Order actions ─────────────────────────────────────────────────
  const handleAccept = async (id) => {
    try {
      await orderService.respondToOrder(id, 'accept');
      setToast({ message: 'Order accepted.', type: 'success' });
      setSelectedOrder(null);
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to accept order.', type: 'error' });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    try {
      await orderService.respondToOrder(rejectOrder.id, 'reject', rejectReason.trim());
      setToast({ message: 'Order rejected.', type: 'success' });
      setRejectOrder(null); setRejectReason(''); setSelectedOrder(null);
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to reject order.', type: 'error' });
    }
  };

  // ── Quote submit ──────────────────────────────────────────────────
  const resetQuoteModal = () => {
    setQuoteRFQ(null);
    setQuoteForm({ price: '', lead_time_days: '', compliance_notes: '', document: null });
    setQuoteError('');
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    const price = parseFloat(quoteForm.price);
    const lead  = parseInt(quoteForm.lead_time_days, 10);
    if (!price || price <= 0)  { setQuoteError('Enter a valid price.'); return; }
    if (!lead  || lead  <= 0)  { setQuoteError('Enter a valid lead time (days).'); return; }
    if (!quoteForm.document)   { setQuoteError('You must upload a quotation document (PDF).'); return; }

    setSubmittingQuote(true);
    let document_url = '';
    try {
      const up = await uploadService.uploadPODocument(quoteForm.document);
      document_url = up.file_url;
    } catch (err) {
      setQuoteError('Failed to upload document. ' + (err.message || ''));
      setSubmittingQuote(false);
      return;
    }
    try {
      await quoteService.submitQuote({ rfq_id: quoteRFQ.id, price, lead_time_days: lead, compliance_notes: quoteForm.compliance_notes || null, document_url });
      setToast({ message: 'Quotation submitted successfully!', type: 'success' });
      resetQuoteModal();
      load();
    } catch (error) {
      setQuoteError(error.message || 'Failed to submit quotation.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const pendingOrderCount = orders.filter(o => o.status === 'pending' || o.status === 'vendor_review').length;
  const activeRFQCount    = rfqs.filter(r => r.status === 'active' || r.status === 'extended').length;

  // ── Drawer: Order detail --------------------------------------------
  const OrderDrawer = () => {
    if (!selectedOrder) return null;
    const o = selectedOrder;
    const isPending = o.status === 'pending' || o.status === 'vendor_review';
    return (
      <div className="space-y-5 text-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
          <div>
            <p className="font-bold text-brand-900 font-mono">{o.order_number}</p>
            <p className="text-xs text-brand-400 mt-0.5">From: {o.manufacturer_org_code || `Org #${o.manufacturer_org_id}`}</p>
          </div>
          <StatusBadge status={o.status} />
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            ['Amount',   `₹${parseFloat(o.total_amount || 0).toLocaleString('en-IN')}`],
            ['Priority', o.priority],
            ['Date',     o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'],
            ['Expected Delivery', o.expected_delivery_date || '—'],
          ].map(([label, val]) => val && val !== '—' ? (
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">{label}</dt>
              <dd className="font-medium text-brand-800">{val}</dd>
            </div>
          ) : null)}
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

        {/* PO Document */}
        {o.po_document_url && (
          <a
            href={toAbsUrl(o.po_document_url)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-surface-50 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-brand-700"><FileText size={15} />PO Document</span>
            <ExternalLink size={14} className="text-brand-400" />
          </a>
        )}

        {/* Actions */}
        {isPending ? (
          <div className="pt-4 border-t border-surface-200 space-y-3">
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Actions</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(o.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex-1 justify-center"
              >
                <CheckCircle size={15} /> Accept Order
              </button>
              <button
                onClick={() => { setRejectOrder(o); setRejectReason(''); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 flex-1 justify-center"
              >
                <XCircle size={15} /> Reject
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-surface-200">
            <span className={`badge ${o.status === 'accepted' ? 'badge-accepted' : o.status === 'rejected' ? 'badge-rejected' : 'badge-shipped'}`}>
              {o.status === 'accepted' ? '✓ Accepted' : o.status === 'rejected' ? '✗ Rejected' : o.status}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── Drawer: RFQ detail ───────────────────────────────────────────
  const RFQDrawer = () => {
    if (!selectedRFQ) return null;
    const rfq = selectedRFQ;
    let desc = rfq.description || '';
    let rate = '—';
    const match = desc.match(/\[Minimum Expected Rate:\s*(.*?)\]/);
    if (match) { rate = match[1]; desc = desc.replace(/\[Minimum Expected Rate:\s*(.*?)\]/, '').trim(); }

    const alreadyQuoted = myQuotes.some(q => q.rfq_id === rfq.id);
    const canQuote = (rfq.status === 'active' || rfq.status === 'extended') && !alreadyQuoted;

    return (
      <div className="space-y-5 text-sm">
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
          <div>
            <p className="font-bold text-brand-900">{rfq.title}</p>
            <p className="text-xs text-brand-400 mt-0.5">RFQ #{rfq.id} · {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString() : ''}</p>
          </div>
          <RFQBadge status={rfq.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            ['Category', rfq.category?.name],
            ['Min. Rate Expected', rate],
            ['Location Filter', rfq.location_filter],
            ['Priority', rfq.is_priority ? 'Yes' : 'No'],
            ['Deadline', rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : '—'],
          ].filter(([,v])=>v&&v!=='—').map(([label,val])=>(
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">{label}</dt>
              <dd className="font-medium text-brand-800">{val}</dd>
            </div>
          ))}
          {desc && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">Description</dt>
              <dd className="text-brand-700 whitespace-pre-wrap">{desc}</dd>
            </div>
          )}
          {rfq.product?.description && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">Product Description</dt>
              <dd className="text-brand-700 whitespace-pre-wrap">{rfq.product.description}</dd>
            </div>
          )}
        </dl>

        {rfq.org && (
          <div>
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest pb-2 border-b border-surface-200 mb-3">Manufacturer (Buyer)</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[['Name', rfq.org.contact_name], ['Email', rfq.org.contact_email], ['Phone', rfq.org.contact_phone]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l}><dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">{l}</dt><dd className="font-medium text-brand-800">{v}</dd></div>
              ))}
            </dl>
          </div>
        )}

        {/* CTA */}
        <div className="pt-4 border-t border-surface-200">
          {canQuote ? (
            <button
              onClick={() => { setSelectedRFQ(null); setQuoteRFQ(rfq); setQuoteForm({ price:'', lead_time_days:'', compliance_notes:'', document:null }); setQuoteError(''); }}
              className="btn-accent w-full justify-center"
            >
              <FileText size={15} /> Submit Quotation
            </button>
          ) : alreadyQuoted ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
              <CheckCircle size={15} /> Quotation already submitted
            </div>
          ) : (
            <div className="badge badge-rejected">RFQ is {rfq.status}</div>
          )}
        </div>
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Orders &amp; RFQs</h1>
        <p className="text-sm text-brand-400 mt-1">Manage purchase orders and quotation requests from manufacturers.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-surface-200 overflow-x-auto">
          <Tab active={tab==='orders'} onClick={() => setTab('orders')} icon={ShoppingCart} label="Purchase Orders" count={pendingOrderCount} />
          <Tab active={tab==='rfqs'}   onClick={() => setTab('rfqs')}   icon={FileText}     label="RFQ Requests"   count={activeRFQCount} />
        </div>

        {/* ── Orders Tab ── */}
        {tab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 text-brand-600 text-xs font-semibold uppercase tracking-wide border-b border-surface-200">
                  <th className="text-left px-5 py-3.5">Order #</th>
                  <th className="text-left px-5 py-3.5">Manufacturer Org</th>
                  <th className="text-left px-5 py-3.5">Amount</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-left px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {orders.map(o => (
                  <tr key={o.id} onClick={() => setSelectedOrder(o)} className="row-clickable border-l-2 border-transparent hover:border-l-brand-500">
                    <td className="px-5 py-4 font-mono text-xs text-brand-600 font-semibold">{o.order_number}</td>
                    <td className="px-5 py-4 font-medium text-brand-800">{o.manufacturer_org_code || `Org #${o.manufacturer_org_id}`}</td>
                    <td className="px-5 py-4 text-brand-700 font-medium">₹{parseFloat(o.total_amount||0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-4 text-brand-400 text-xs">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4 text-brand-300"><ChevronRight size={16} /></td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-brand-400">No orders received yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── RFQ Tab ── */}
        {tab === 'rfqs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 text-brand-600 text-xs font-semibold uppercase tracking-wide border-b border-surface-200">
                  <th className="text-left px-5 py-3.5">Title</th>
                  <th className="text-left px-5 py-3.5">Category</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-left px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {rfqs.map(rfq => (
                  <tr key={rfq.id} onClick={() => setSelectedRFQ(rfq)} className="row-clickable border-l-2 border-transparent hover:border-l-brand-500">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-brand-900">{rfq.title}</p>
                      {myQuotes.some(q => q.rfq_id === rfq.id) && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5"><CheckCircle size={11} />Quoted</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-brand-500">{rfq.category?.name || '—'}</td>
                    <td className="px-5 py-4"><RFQBadge status={rfq.status} /></td>
                    <td className="px-5 py-4 text-brand-400 text-xs">{rfq.created_at ? new Date(rfq.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                    <td className="px-5 py-4 text-brand-300"><ChevronRight size={16} /></td>
                  </tr>
                ))}
                {rfqs.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-16 text-center text-brand-400">No RFQ requests received yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      <DetailDrawer
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.order_number || 'Order Details'}
        subtitle={selectedOrder ? `From ${selectedOrder.manufacturer_org_code || `Org #${selectedOrder.manufacturer_org_id}`}` : ''}
      >
        <OrderDrawer />
      </DetailDrawer>

      {/* RFQ Detail Drawer */}
      <DetailDrawer
        open={!!selectedRFQ}
        onClose={() => setSelectedRFQ(null)}
        title={selectedRFQ?.title || 'RFQ Details'}
        subtitle={selectedRFQ ? `RFQ #${selectedRFQ.id}` : ''}
      >
        <RFQDrawer />
      </DetailDrawer>

      {/* Reject Reason Modal */}
      <Modal open={!!rejectOrder} onClose={() => { setRejectOrder(null); setRejectReason(''); }} title="Reject Purchase Order">
        {rejectOrder && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-100 rounded-lg">
              <p className="text-sm font-semibold text-brand-900">{rejectOrder.order_number}</p>
              <p className="text-xs text-brand-400">From: {rejectOrder.manufacturer_org_code || `Org #${rejectOrder.manufacturer_org_id}`}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input-field resize-none h-24"
                placeholder="Please provide a reason for rejecting this order..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setRejectOrder(null); setRejectReason(''); }} className="btn-secondary">Cancel</button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle size={13} /> Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit Quote Modal */}
      <Modal open={!!quoteRFQ} onClose={resetQuoteModal} title="Submit Quotation" size="lg">
        {quoteRFQ && (
          <form onSubmit={handleQuoteSubmit} className="space-y-4">
            <div className="p-3 bg-surface-100 rounded-lg">
              <p className="text-xs text-brand-500 mb-1">RFQ Details</p>
              <p className="text-sm font-semibold text-brand-900">{quoteRFQ.title}</p>
              {quoteRFQ.description && <p className="text-xs text-brand-500 mt-1 italic">&ldquo;{quoteRFQ.description.replace(/\[Minimum Expected Rate: .*?\]/, '')}&rdquo;</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1.5">Price (₹ Total) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="1000" className="input-field" placeholder="e.g. 50000" value={quoteForm.price} onChange={e => setQuoteForm({...quoteForm, price:e.target.value})} onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1.5">Lead Time (days) <span className="text-red-500">*</span></label>
                <input type="number" min="1" className="input-field" placeholder="e.g. 14" value={quoteForm.lead_time_days} onChange={e => setQuoteForm({...quoteForm, lead_time_days:e.target.value})} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Compliance Notes (optional)</label>
              <textarea className="input-field resize-none h-20" placeholder="Any compliance or delivery conditions..." value={quoteForm.compliance_notes} onChange={e => setQuoteForm({...quoteForm, compliance_notes:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Quotation Document / PDF <span className="text-red-500">*</span></label>
              <input type="file" accept="application/pdf" className="input-field p-2" onChange={e => setQuoteForm({...quoteForm, document:e.target.files[0]})} />
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <Clock size={13} className="mt-0.5 flex-shrink-0" />
              <span>Once submitted, the manufacturer can view your quote and place an order referencing it.</span>
            </div>
            {quoteError && <p className="text-red-600 text-xs">{quoteError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetQuoteModal} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-accent" disabled={submittingQuote}>
                {submittingQuote ? 'Submitting...' : 'Submit Quotation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default VendorOrders;
