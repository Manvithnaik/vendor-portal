import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { rfqService } from '../../services/rfqService';
import { quoteService } from '../../services/quoteService';
import { orderService } from '../../services/orderService';
import { uploadService } from '../../services/uploadService';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import {
  Search, FileText, Eye, ChevronDown, ChevronUp,
  Package, Clock, CheckCircle, Inbox, ShoppingCart, AlertCircle, Upload
} from 'lucide-react';
import { toAbsUrl } from '../../utils/url';

// ── Status badge — backend RfqStatusEnum: draft|active|extended|closed|cancelled
const RFQStatusBadge = ({ status }) => {
  const map   = { active: 'bg-yellow-100 text-yellow-800', extended: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-600', draft: 'bg-gray-100 text-gray-400', cancelled: 'bg-red-100 text-red-500' };
  const label = { active: 'Open', extended: 'Extended', closed: 'Closed', draft: 'Draft', cancelled: 'Cancelled' };
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status === 'active'   && <Clock size={10} className="mr-1" />}
      {status === 'closed'   && <CheckCircle size={10} className="mr-1" />}
      {label[status] || status}
    </span>
  );
};

// ── Quote card — shows actual QuoteResponse fields from API ─────────────────
// QuoteResponse: { id, rfq_id, manufacturer_org_id, price, lead_time_days, compliance_notes, version, is_locked, status, created_at }
const QuoteCard = ({ q, onPlaceOrder, onViewDetails }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-surface-200 rounded-lg hover:border-brand-300 transition-colors flex-wrap gap-2">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
        <FileText size={16} className="text-indigo-600" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-brand-900">
          Quote #{q.id} — <span className="text-accent-700 font-semibold">₹{parseFloat(q.price || 0).toLocaleString()}</span>
        </p>
        <p className="text-xs text-brand-400">
          Lead time: <span className="font-medium text-brand-600">{q.lead_time_days} days</span>
          {' · '}
          by {q.manufacturer_org_name || `Org #${q.manufacturer_org_id}`}
          {' · '}
          {q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        </p>
        {q.compliance_notes && (
          <p className="text-xs text-brand-500 mt-0.5 truncate max-w-xs italic">"{q.compliance_notes}"</p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
      <span className={`badge text-xs ${q.status === 'accepted' ? 'bg-green-100 text-green-700' : q.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
        {q.status}
      </span>
      {onViewDetails && (
        <button onClick={() => onViewDetails(q)} className="btn-secondary text-xs py-1.5 px-3">
          View Details
        </button>
      )}
      {onPlaceOrder && q.status !== 'rejected' && (
        <button
          onClick={() => onPlaceOrder(q)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <ShoppingCart size={13} /> Place Order
        </button>
      )}
    </div>
  </div>
);

// ── RFQ accordion row ────────────────────────────────────────────────────────
const RFQRow = ({ rfq, onPlaceOrder, onViewDetails }) => {
  const [open, setOpen]           = useState(false);
  const [quotations, setQuotations] = useState([]);

  const loadQuotations = useCallback(async () => {
    try {
      const res = await quoteService.listQuotes(rfq.id);
      setQuotations(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  }, [rfq.id]);

  useEffect(() => { if (open) loadQuotations(); }, [open, loadQuotations]);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            {/* Backend RFQResponse has 'title' not 'product_name' */}
            <p className="text-sm font-semibold text-brand-900 truncate">{rfq.title || `RFQ #${rfq.id}`}</p>
            <p className="text-xs text-brand-400">
              Deadline: {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : '—'}
              {' · '}
              {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <RFQStatusBadge status={rfq.status} />
          {open
            ? <ChevronUp size={16} className="text-brand-400" />
            : <ChevronDown size={16} className="text-brand-400" />
          }
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-surface-100 space-y-3 animate-fade-in">
          {rfq.description && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-medium text-amber-700 mb-0.5">Description</p>
              <p className="text-sm text-amber-800">{rfq.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">
              Submitted Quotations ({quotations.length})
            </p>
            {quotations.length > 0 ? (
              <div className="space-y-2">
                {quotations.map(q => (
                  <QuoteCard
                    key={q.id}
                    q={q}
                    onPlaceOrder={rfq.status !== 'closed' ? (quot) => onPlaceOrder(rfq, quot) : null}
                    onViewDetails={(quot) => onViewDetails(rfq, quot)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-surface-50 rounded-lg border border-dashed border-surface-300">
                <Clock size={24} className="text-brand-200 mx-auto mb-2" />
                <p className="text-sm text-brand-400">Waiting for vendors to submit quotations.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const EMPTY_ORDER = { delivery_address: '', required_by_date: '', notes: '' };

const Quotations = () => {
  const { user } = useAuth();
  const [rfqs, setRfqs]         = useState([]);
  const [search, setSearch]     = useState('');
  const [toast, setToast]       = useState(null);

  const [viewQuoteData, setViewQuoteData] = useState(null); // { rfq, quote }

  // Place Order modal state
  const [orderRFQ, setOrderRFQ]             = useState(null);
  const [orderQuotation, setOrderQuotation] = useState(null);
  const [orderForm, setOrderForm]           = useState(EMPTY_ORDER);
  const [orderError, setOrderError]         = useState('');
  const [poFile, setPoFile]                 = useState(null);
  const [poError, setPoError]               = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [uploadStep, setUploadStep]         = useState(''); // 'uploading' | 'creating' | ''
  const poInputRef = useRef(null);

  const load = async () => {
    try {
      const res = await rfqService.listRFQs();
      const data = res?.data;
      const rfqsArray = Array.isArray(data) ? data : [];
      setRfqs(rfqsArray);
      
      if (user?.email) {
         const activeRFQs = rfqsArray.filter(r => r.status === 'active' || r.status === 'extended');
         let totalQuotes = 0;
         await Promise.all(activeRFQs.map(async (rfq) => {
            try {
               const qRes = await quoteService.listQuotes(rfq.id);
               if (qRes && Array.isArray(qRes.data)) {
                  totalQuotes += qRes.data.length;
               }
            } catch(e) {}
         }));
         localStorage.setItem(`lastSeenQuoteCount_${user.email}`, totalQuotes.toString());
         window.dispatchEvent(new Event('quoteRead'));
      }
    } catch (e) {
      setToast({ message: e.message || 'Failed to load RFQs', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  // Filter: rfq.title is the correct field (RFQResponse schema)
  const filtered = rfqs.filter(r =>
    (r.title || '').toLowerCase().includes(search.toLowerCase())
  );

  // Sort: active/extended first, then closed, then draft/cancelled
  const sorted = [...filtered].sort((a, b) => {
    const order = { active: 0, extended: 1, closed: 2, draft: 3, cancelled: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  const openCount      = rfqs.filter(r => r.status === 'active' || r.status === 'extended').length;
  const closedCount    = rfqs.filter(r => r.status === 'closed').length;

  // Place Order handlers
  const handlePlaceOrder = (rfq, quotation) => {
    setOrderRFQ(rfq);
    setOrderQuotation(quotation);
    setOrderForm(EMPTY_ORDER);
    setOrderError('');
  };

  const resetOrderModal = () => {
    setOrderRFQ(null);
    setOrderQuotation(null);
    setOrderForm(EMPTY_ORDER);
    setPoFile(null);
    setPoError('');
    setOrderError('');
    setUploadStep('');
    if (poInputRef.current) poInputRef.current.value = '';
  };

  const handlePoFileChange = (e) => {
    const file = e.target.files[0];
    setPoError('');
    setPoFile(null);
    if (!file) return;
    if (file.type !== 'application/pdf') { setPoError('Only PDF files allowed.'); return; }
    if (file.size > 10 * 1024 * 1024)   { setPoError('File must be under 10 MB.'); return; }
    setPoFile(file);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (submittingOrder) return; // double-click guard
    if (!orderForm.delivery_address.trim()) { setOrderError('Delivery address is required.'); return; }
    if (!poFile) { setPoError('Please upload a PO document (PDF).'); return; }

    setSubmittingOrder(true);
    setOrderError('');
    setPoError('');

    try {
      // Step 1: Upload PO document
      setUploadStep('uploading');
      const { file_url } = await uploadService.uploadPODocument(poFile);

      // Step 2: Select the quote (locks it, closes RFQ, rejects others)
      setUploadStep('creating');
      await quoteService.selectQuote(orderRFQ.id, orderQuotation.id);

      // Step 3: Create order with real upload URL
      await orderService.createOrder({
        quotation_id:        orderQuotation.id,
        manufacturer_org_id: orderQuotation.manufacturer_org_id,
        po_document_url:     file_url,
        delivery_address:    orderForm.delivery_address,
        required_by_date:    orderForm.required_by_date || undefined,
        notes:               orderForm.notes || undefined,
      });

      setToast({ message: `Order placed for "${orderRFQ.title || `RFQ #${orderRFQ.id}`}"! The vendor will review and respond.`, type: 'success' });
      resetOrderModal();
      load();
    } catch (err) {
      setOrderError(err.message || 'Failed to place order. Please try again.');
      setUploadStep('');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Quotations</h1>
        <p className="text-sm text-brand-400 mt-1">
          View all RFQs you have sent and quotations submitted by vendors.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total RFQs',           value: rfqs.length,   color: 'bg-brand-50 text-brand-700' },
          { label: 'Awaiting Response',     value: openCount,     color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Closed (Quote Selected)', value: closedCount, color: 'bg-green-50 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.color}`}>
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
        <input
          className="input-field pl-10"
          placeholder="Filter by RFQ title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* RFQ list */}
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map(rfq => <RFQRow key={rfq.id} rfq={rfq} onPlaceOrder={handlePlaceOrder} onViewDetails={(r, q) => setViewQuoteData({ rfq: r, quote: q })} />)}
        </div>
      ) : (
        <div className="card p-16 text-center">
          <Inbox size={44} className="text-brand-200 mx-auto mb-3" />
          <p className="text-brand-700 font-medium mb-1">
            {search ? 'No RFQs match your search.' : 'No RFQs sent yet.'}
          </p>
          <p className="text-sm text-brand-400">
            Browse products and click <strong>"Request for Quotation"</strong> to get started.
          </p>
        </div>
      )}

      {/* Place Order Modal */}
      <Modal open={!!orderRFQ} onClose={resetOrderModal} title="Place Purchase Order">
        {orderRFQ && (
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="p-3 bg-surface-100 rounded-lg">
              <p className="text-xs text-brand-500 mb-1">Order Summary</p>
              <p className="text-sm font-semibold text-brand-900">{orderRFQ.title || `RFQ #${orderRFQ.id}`}</p>
              {orderQuotation && (
                <p className="text-xs text-brand-500 mt-1">
                  Quote #{orderQuotation.id} — <strong>₹{parseFloat(orderQuotation.price || 0).toLocaleString()}</strong>
                  {' · '} Lead: {orderQuotation.lead_time_days} days
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input-field resize-none h-20"
                placeholder="Full delivery address..."
                value={orderForm.delivery_address}
                onChange={(e) => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                required
              />
            </div>

            {/* PO File Upload */}
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                PO Document <span className="text-red-500">*</span>
                <span className="text-brand-400 font-normal ml-1">(PDF · max 10 MB)</span>
              </label>
              <div
                onClick={() => !submittingOrder && poInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  poFile ? 'border-green-400 bg-green-50' : 'border-brand-200 bg-surface-50 hover:border-brand-400'
                } ${submittingOrder ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {poFile ? (
                  <>
                    <FileText size={22} className="text-green-600 mb-1" />
                    <p className="text-sm font-semibold text-green-700 truncate max-w-full">{poFile.name}</p>
                    <p className="text-xs text-green-600">{(poFile.size / 1024).toFixed(1)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <Upload size={22} className="text-brand-300 mb-1" />
                    <p className="text-sm font-medium text-brand-600">Click to select PDF</p>
                  </>
                )}
                <input ref={poInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePoFileChange} disabled={submittingOrder} />
              </div>
              {poError && (
                <div className="flex items-center gap-1.5 text-red-600 text-xs mt-1.5">
                  <AlertCircle size={13} /> {poError}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Required By Date</label>
              <input
                type="date"
                className="input-field"
                value={orderForm.required_by_date}
                onChange={(e) => setOrderForm({ ...orderForm, required_by_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Notes <span className="text-brand-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="input-field resize-none h-16"
                placeholder="Any special instructions..."
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              />
            </div>

            {orderError && (
              <div className="flex items-center gap-2 text-red-600 text-xs">
                <AlertCircle size={13} /> {orderError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetOrderModal} disabled={submittingOrder} className="btn-secondary disabled:opacity-50">Cancel</button>
              <button type="submit" className="btn-accent" disabled={submittingOrder}>
                <ShoppingCart size={15} />
                {submittingOrder
                  ? uploadStep === 'uploading' ? 'Uploading PO...' : 'Creating Order...'
                  : 'Place Order'
                }
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Quote Details Modal */}
      <Modal open={!!viewQuoteData} onClose={() => setViewQuoteData(null)} title="Quotation Details">
        {viewQuoteData && (
          <div className="space-y-4 text-sm mt-2">
            
            {/* Vendor Details */}
            {viewQuoteData.quote.manufacturer_org && (
              <div>
                <p className="font-semibold text-brand-900 border-b pb-1 mb-2">Vendor Details</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div><dt className="text-brand-400">Vendor Name</dt><dd className="font-medium text-brand-800">{viewQuoteData.quote.manufacturer_org_name || viewQuoteData.quote.manufacturer_org?.name || '—'}</dd></div>
                  <div><dt className="text-brand-400">Contact</dt><dd className="font-medium text-brand-800">{viewQuoteData.quote.manufacturer_org.contact_name || '—'}</dd></div>
                  <div className="col-span-2"><dt className="text-brand-400">Email & Phone</dt><dd className="font-medium text-brand-800">
                    {viewQuoteData.quote.manufacturer_org.contact_email || '—'} / {viewQuoteData.quote.manufacturer_org.contact_phone || '—'}
                  </dd></div>
                  <div className="col-span-2"><dt className="text-brand-400">Address</dt><dd className="font-medium text-brand-800">
                    {(viewQuoteData.quote.manufacturer_org.address_line1 || '') + (viewQuoteData.quote.manufacturer_org.city ? ', ' + viewQuoteData.quote.manufacturer_org.city : '') || '—'}
                  </dd></div>
                </dl>
              </div>
            )}

            {/* Quotation Details */}
            <div>
              <p className="font-semibold text-brand-900 border-b pb-1 mb-2 mt-4">Quotation Information</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><dt className="text-brand-400">Total Price</dt><dd className="font-semibold text-green-700">₹{parseFloat(viewQuoteData.quote.price || 0).toLocaleString()}</dd></div>
                <div><dt className="text-brand-400">Lead Time</dt><dd className="font-medium text-brand-800">{viewQuoteData.quote.lead_time_days} days</dd></div>
                <div><dt className="text-brand-400">Submitted Date</dt><dd className="font-medium text-brand-800">{viewQuoteData.quote.created_at ? new Date(viewQuoteData.quote.created_at).toLocaleDateString() : '—'}</dd></div>
                <div><dt className="text-brand-400">Status</dt><dd className="font-medium text-brand-800 capitalize">{viewQuoteData.quote.status}</dd></div>
                {viewQuoteData.quote.compliance_notes && (
                  <div className="col-span-2"><dt className="text-brand-400">Compliance Notes</dt><dd className="text-brand-700 whitespace-pre-wrap italic">{viewQuoteData.quote.compliance_notes}</dd></div>
                )}
              </dl>
            </div>

            {/* Product Details (RFQ based) */}
            <div>
              <p className="font-semibold text-brand-900 border-b pb-1 mb-2 mt-4">Product / RFQ Details</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><dt className="text-brand-400">Product Name</dt><dd className="font-medium text-brand-800">{viewQuoteData.rfq.product?.name || viewQuoteData.rfq.title || '—'}</dd></div>
                <div><dt className="text-brand-400">Category</dt><dd className="font-medium text-brand-800">{viewQuoteData.rfq.category?.name || '—'}</dd></div>
                <div className="col-span-2"><dt className="text-brand-400">Product Description</dt><dd className="text-brand-700 whitespace-pre-wrap">{viewQuoteData.rfq.product?.description || '—'}</dd></div>
                {viewQuoteData.rfq.description && (
                  <div className="col-span-2">
                    <dt className="text-brand-400 font-medium">RFQ Note / Message</dt>
                    <dd className="p-3 mt-1 bg-amber-50 border border-amber-200 rounded text-brand-800 whitespace-pre-wrap italic text-xs">
                      {viewQuoteData.rfq.description.replace(/\[Minimum Expected Rate: .*?\]/, '').trim() || '—'}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quotation Document */}
            {viewQuoteData.quote.document_url && (
              <div className="mt-4 p-4 border border-surface-200 rounded-lg bg-surface-50">
                <p className="text-sm font-semibold text-brand-800 mb-2">Quotation Document</p>
                <a
                  href={toAbsUrl(viewQuoteData.quote.document_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-brand-300 rounded-md text-sm font-medium text-brand-700 hover:text-brand-900 hover:border-brand-400 transition-colors shadow-sm"
                >
                  <FileText size={16} className="text-brand-500" />
                  View / Download Quotation PDF
                </a>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-surface-200 mt-4">
               <button onClick={() => setViewQuoteData(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Quotations;
