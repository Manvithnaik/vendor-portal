import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { rfqService } from '../../services/rfqService';
import { quoteService } from '../../services/quoteService';
import { orderService } from '../../services/orderService';
import { uploadService } from '../../services/uploadService';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import {
  CheckCircle, XCircle, FileText, Package,
  ShoppingCart, Clock, Eye, ExternalLink
} from 'lucide-react';
import { toAbsUrl } from '../../utils/url';

// ── Tab button ──────────────────────────────────────────────────────────────
const Tab = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active
      ? 'border-brand-800 text-brand-900'
      : 'border-transparent text-brand-400 hover:text-brand-700'
      }`}
  >
    <Icon size={15} />
    {label}
    {count > 0 && (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${active ? 'bg-brand-800 text-white' : 'bg-brand-100 text-brand-600'
        }`}>
        {count}
      </span>
    )}
  </button>
);

// ── RFQ status badge ────────────────────────────────────────────────────────
// Backend RfqStatusEnum: draft | active | extended | closed | cancelled
const RFQBadge = ({ status }) => {
  const map = {
    active: 'bg-yellow-100 text-yellow-800',
    extended: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-500',
    closed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-500',
  };
  const label = { active: 'Open', extended: 'Extended', draft: 'Draft', closed: 'Closed', cancelled: 'Cancelled' };
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {label[status] || status}
    </span>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const VendorOrders = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [myQuotes, setMyQuotes] = useState([]);
  const [toast, setToast] = useState(null);

  // Quote submit modal state (vendor submits price+lead_time to manufacturer RFQ)
  const [quoteRFQ, setQuoteRFQ] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ price: '', lead_time_days: '', compliance_notes: '', document: null });
  const [quoteError, setQuoteError] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [viewRFQ, setViewRFQ] = useState(null);

  // PO detail modal
  const [viewOrder, setViewOrder] = useState(null);
  // Reject reason modal
  const [rejectOrder, setRejectOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    try {
      const [orderRes, rfqRes, quoteRes] = await Promise.all([
        orderService.listOrders({ as_customer: false }),
        rfqService.listRFQs(),
        quoteService.myQuotes()
      ]);
      setOrders(Array.isArray(orderRes?.data) ? orderRes.data : []);
      setRfqs(Array.isArray(rfqRes?.data) ? rfqRes.data : []);
      setMyQuotes(Array.isArray(quoteRes?.data) ? quoteRes.data : []);
    } catch (e) {
      setToast({ message: e.message || 'Failed to load data', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  // ── Order actions ────────────────────────────────────────────────────────
  const handleOrderAction = async (id, action) => {
    try {
      await orderService.respondToOrder(id, action);
      setToast({ message: `Order ${action === 'accept' ? 'accepted' : 'rejected'}.`, type: 'success' });
      setViewOrder(null);
      load();
    } catch (err) {
      setToast({ message: err.message || `Failed to ${action} order.`, type: 'error' });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    try {
      await orderService.respondToOrder(rejectOrder.id, 'reject', rejectReason.trim());
      setToast({ message: 'Order rejected.', type: 'success' });
      setRejectOrder(null);
      setRejectReason('');
      setViewOrder(null);
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to reject order.', type: 'error' });
    }
  };

  // ── Quote submit (vendor replies to RFQ with price + lead_time) ──────────
  const resetQuoteModal = () => {
    setQuoteRFQ(null);
    setQuoteForm({ price: '', lead_time_days: '', compliance_notes: '', document: null });
    setQuoteError('');
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    const price = parseFloat(quoteForm.price);
    const lead = parseInt(quoteForm.lead_time_days, 10);
    if (!price || price <= 0) { setQuoteError('Enter a valid price.'); return; }
    if (!lead || lead <= 0) { setQuoteError('Enter a valid lead time (days).'); return; }
    if (!quoteForm.document) { setQuoteError('You must upload a quotation document (PDF).'); return; }

    setSubmittingQuote(true);
    let document_url = '';
    try {
      const uploadRes = await uploadService.uploadPODocument(quoteForm.document);
      document_url = uploadRes.file_url;
    } catch (err) {
      setQuoteError('Failed to upload document. ' + (err.message || ''));
      setSubmittingQuote(false);
      return;
    }

    try {
      await quoteService.submitQuote({
        rfq_id: quoteRFQ.id,
        price,
        lead_time_days: lead,
        compliance_notes: quoteForm.compliance_notes || null,
        document_url: document_url,
      });
      setToast({ message: 'Quotation submitted successfully!', type: 'success' });
      resetQuoteModal();
      load();
    } catch (error) {
      setQuoteError(error.message || 'Failed to submit quotation.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Backend sends 'vendor_review' for orders awaiting action;
  // OrderResponse.status is now serialized via field_serializer to frontend-friendly values,
  // but 'vendor_review' maps to 'pending' in the mapper. Keep both for safety.
  const pendingOrderCount = orders.filter(o => o.status === 'pending' || o.status === 'vendor_review').length;
  const activeRFQCount = rfqs.filter(r => r.status === 'active' || r.status === 'extended').length;

  useEffect(() => {
    if (tab === 'rfqs') {
      localStorage.setItem(`lastSeenRFQCount_${user?.email}`, activeRFQCount.toString());
      window.dispatchEvent(new Event('rfqRead'));
    }
  }, [tab, activeRFQCount, user?.email]);

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Orders &amp; RFQs</h1>
        <p className="text-sm text-brand-400 mt-1">Manage purchase orders and quotation requests from manufacturers.</p>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-surface-200 overflow-x-auto">
          <Tab active={tab === 'orders'} onClick={() => setTab('orders')} icon={ShoppingCart} label="Purchase Orders" count={pendingOrderCount} />
          <Tab active={tab === 'rfqs'} onClick={() => setTab('rfqs')} icon={FileText} label="RFQ Requests" count={activeRFQCount} />
        </div>

        {/* ── Orders Tab ── */}
        {tab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 text-brand-600">
                  <th className="text-left px-5 py-3 font-medium">Order #</th>
                  <th className="text-left px-5 py-3 font-medium">Manufacturer Org</th>
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
                    <td className="px-5 py-3 font-medium text-brand-800">{o.manufacturer_org_code || `Org #${o.manufacturer_org_id}`}</td>
                    <td className="px-5 py-3 text-brand-600">
                      {o.currency} {parseFloat(o.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-brand-400">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.po_document_url && (
                          <a href={toAbsUrl(o.po_document_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View PO Document">
                            <FileText size={15} />
                          </a>
                        )}
                        <button onClick={() => setViewOrder(o)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View Details">
                          <Eye size={15} />
                        </button>
                        {/* status is 'pending' from serializer (maps from vendor_review) */}
                        {(o.status === 'pending' || o.status === 'vendor_review') && (
                          <>
                            <button onClick={() => handleOrderAction(o.id, 'accept')} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Accept">
                              <CheckCircle size={15} />
                            </button>
                            <button onClick={() => { setRejectOrder(o); setRejectReason(''); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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
          <div className="divide-y divide-surface-200">
            {rfqs.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <FileText size={40} className="text-brand-200 mx-auto mb-3" />
                <p className="text-brand-400">No RFQ requests received yet.</p>
                <p className="text-sm text-brand-300 mt-1">When manufacturers broadcast RFQs to your organisation, they will appear here.</p>
              </div>
            ) : (
              rfqs.map(rfq => (
                <div key={rfq.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-900 truncate">{rfq.title}</p>
                      <p className="text-xs text-brand-400">
                        RFQ #{rfq.id}
                        {' · '}
                        {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      </p>
                      {rfq.description && (
                        <p className="text-xs text-brand-500 mt-0.5 truncate max-w-xs">{rfq.description.replace(/\[Minimum Expected Rate: .*?\]/, '')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <RFQBadge status={rfq.status} />
                    <button onClick={() => setViewRFQ(rfq)} className="btn-secondary text-xs py-2 px-3">Open</button>
                    {(rfq.status === 'active' || rfq.status === 'extended') ? (
                      myQuotes.some(q => q.rfq_id === rfq.id) ? (
                        <button className="btn-secondary text-xs py-2 bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" disabled>
                          Quotation Submitted
                        </button>
                      ) : (
                        <button
                          onClick={() => { setQuoteRFQ(rfq); setQuoteForm({ price: '', lead_time_days: '', compliance_notes: '', document: null }); setQuoteError(''); }}
                          className="btn-accent text-xs py-2"
                        >
                          Submit Quotation
                        </button>
                      )
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                        <CheckCircle size={13} />
                        {rfq.status === 'closed' ? 'Closed' : rfq.status}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Submit Quote Modal ── */}
      <Modal open={!!quoteRFQ} onClose={resetQuoteModal} title="Submit Quotation" size="lg">
        {quoteRFQ && (
          <form onSubmit={handleQuoteSubmit} className="space-y-4">
            <div className="p-3 bg-surface-100 rounded-lg">
              <p className="text-xs text-brand-500 mb-1">RFQ Details</p>
              <p className="text-sm font-semibold text-brand-900">{quoteRFQ.title}</p>
              {quoteRFQ.description && <p className="text-xs text-brand-500 mt-1 italic">"{quoteRFQ.description.replace(/\[Minimum Expected Rate: .*?\]/, '')}"</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1.5">
                  Price (Total) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="0" step="1000" className="input-field"
                  placeholder="e.g. 50000"
                  value={quoteForm.price}
                  onChange={e => setQuoteForm({ ...quoteForm, price: e.target.value })}
                  onKeyDown={e => {
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1.5">
                  Lead Time (days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1" className="input-field"
                  placeholder="e.g. 14"
                  value={quoteForm.lead_time_days}
                  onChange={e => setQuoteForm({ ...quoteForm, lead_time_days: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Compliance Notes (optional)</label>
              <textarea
                className="input-field resize-none h-20"
                placeholder="Any compliance or delivery conditions..."
                value={quoteForm.compliance_notes}
                onChange={e => setQuoteForm({ ...quoteForm, compliance_notes: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Quotation Document / PDF <span className="text-red-500">*</span>
              </label>
              <input
                type="file" accept="application/pdf" className="input-field p-2"
                onChange={e => setQuoteForm({ ...quoteForm, document: e.target.files[0] })}
              />
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

      {/* ── View RFQ Modal ── */}
      <Modal open={!!viewRFQ} onClose={() => setViewRFQ(null)} title="RFQ Request Details">
        {viewRFQ && (() => {
          let desc = viewRFQ.description || '';
          let rate = '—';
          const match = desc.match(/\[Minimum Expected Rate:\s*(.*?)\]/);
          if (match) {
            rate = match[1];
            desc = desc.replace(/\[Minimum Expected Rate:\s*(.*?)\]/, '').trim();
          }
          return (
            <div className="space-y-4 text-sm mt-2">
              <div>
                <p className="font-semibold text-brand-900 border-b pb-1 mb-2">Product Details</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div><dt className="text-brand-400">Product Name</dt><dd className="font-medium text-brand-800">{viewRFQ.title || '—'}</dd></div>
                  <div><dt className="text-brand-400">Category</dt><dd className="font-medium text-brand-800">{viewRFQ.category?.name || '—'}</dd></div>
                  <div className="col-span-2"><dt className="text-brand-400">Product Description</dt><dd className="text-brand-700 whitespace-pre-wrap">{viewRFQ.product?.description || '—'}</dd></div>
                  <div className="col-span-2"><dt className="text-brand-400">RFQ Note / Message</dt><dd className="text-brand-700 whitespace-pre-wrap">{desc || '—'}</dd></div>
                </dl>
              </div>

              {viewRFQ.org && (
                <div>
                  <p className="font-semibold text-brand-900 border-b pb-1 mb-2 mt-4 text-purple-700">Manufacturer (Buyer) Details</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div><dt className="text-brand-400">Manufacturer ID</dt><dd className="font-medium text-brand-800">{viewRFQ.org?.org_code || (viewRFQ.org_id ? `Org #${viewRFQ.org_id}` : '—')}</dd></div>
                    <div><dt className="text-brand-400">Contact Name</dt><dd className="font-medium text-brand-800">{viewRFQ.org.contact_name || '—'}</dd></div>
                    <div><dt className="text-brand-400">Contact Email</dt><dd className="font-medium text-brand-800">{viewRFQ.org.contact_email || '—'}</dd></div>
                    <div><dt className="text-brand-400">Contact Phone</dt><dd className="font-medium text-brand-800">{viewRFQ.org.contact_phone || '—'}</dd></div>
                    <div className="col-span-2"><dt className="text-brand-400">Address</dt><dd className="font-medium text-brand-800">{(viewRFQ.org.address_line1 || '') + (viewRFQ.org.city ? ', ' + viewRFQ.org.city : '') || '—'}</dd></div>
                  </dl>
                </div>
              )}

              <div>
                <p className="font-semibold text-brand-900 border-b pb-1 mb-2 mt-4">Other RFQ Details</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div><dt className="text-brand-400">Location Filter</dt><dd className="font-medium text-brand-800">{viewRFQ.location_filter || '—'}</dd></div>
                  <div><dt className="text-brand-400">Min. Rate Expected</dt><dd className="font-medium text-brand-800">{rate}</dd></div>
                  <div><dt className="text-brand-400">Priority</dt><dd className="font-medium text-brand-800">{viewRFQ.is_priority ? 'Yes' : 'No'}</dd></div>
                  <div><dt className="text-brand-400">Date Created</dt><dd className="font-medium text-brand-800">{viewRFQ.created_at ? new Date(viewRFQ.created_at).toLocaleDateString() : '—'}</dd></div>
                </dl>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={() => setViewRFQ(null)} className="btn-secondary">Close Window</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── PO Detail Modal ── */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Purchase Order Details" size="lg">
        {viewOrder && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Order #', viewOrder.order_number],
                ['Manufacturer', viewOrder.manufacturer_org_code || `Org #${viewOrder.manufacturer_org_id}`],
                ['Amount', `${viewOrder.currency} ${parseFloat(viewOrder.total_amount || 0).toLocaleString()}`],
                ['Status', viewOrder.status],
                ['Priority', viewOrder.priority],
                ['Date', viewOrder.created_at ? new Date(viewOrder.created_at).toLocaleDateString() : '—'],
              ].filter(([_, val]) => val && val !== '—').map(([label, val]) => (
                <div key={label}>
                  <dt className="text-brand-400">{label}</dt>
                  <dd className="font-medium text-brand-800">{val}</dd>
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
              {viewOrder.po_document_url && (
                <div className="col-span-2">
                  <dt className="text-brand-400">PO Document</dt>
                  <dd className="mt-1">
                    <a
                      href={toAbsUrl(viewOrder.po_document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors border border-brand-200 text-xs font-medium"
                    >
                      <FileText size={14} />
                      View PO Document
                      <ExternalLink size={12} className="opacity-50" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>


            {/* Action buttons */}
            {(viewOrder.status === 'pending' || viewOrder.status === 'vendor_review') && (
              <div className="flex gap-2 pt-2 border-t border-surface-200">
                <button
                  onClick={() => handleOrderAction(viewOrder.id, 'accept')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  <CheckCircle size={14} /> Accept PO
                </button>
                <button
                  onClick={() => { setRejectOrder(viewOrder); setRejectReason(''); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 border border-red-200"
                >
                  <XCircle size={14} /> Reject PO
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Reject Reason Modal ── */}
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
    </div>
  );
};

export default VendorOrders;
