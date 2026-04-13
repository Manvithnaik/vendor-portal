import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRFQs, getQuotations } from '../../utils/storage';
import { rfqApi, orderApi } from '../../utils/api';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import {
  Search, FileText, Download, Eye, ChevronDown, ChevronUp,
  Package, Clock, CheckCircle, Inbox, ShoppingCart, Upload, AlertCircle
} from 'lucide-react';

// ── Status badge helper ──────────────────────────────────────────────────────
const RFQStatusBadge = ({ status }) => {
  const map = {
    open: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status === 'open' && <Clock size={10} className="mr-1" />}
      {status === 'submitted' && <CheckCircle size={10} className="mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ── Download a base64 PDF ────────────────────────────────────────────────────
const downloadPDF = (fileData, fileName) => {
  const link = document.createElement('a');
  link.href = fileData;
  link.download = fileName || 'quotation.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── View a base64 PDF in new tab ─────────────────────────────────────────────
const viewPDF = (fileData) => {
  const win = window.open();
  if (win) {
    win.document.write(
      `<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`
    );
  }
};

// ── Quotation Row card ───────────────────────────────────────────────────────
const QuotationCard = ({ q, onPlaceOrder }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-surface-200 rounded-lg hover:border-brand-300 transition-colors flex-wrap gap-2">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
        <FileText size={16} className="text-red-500" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-brand-900 truncate">{q.fileName}</p>
        <p className="text-xs text-brand-400">
          by <span className="font-medium text-brand-600">{q.vendorName || q.vendorEmail}</span>
          {' · '}
          {new Date(q.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-3 flex-wrap">
      <button
        onClick={() => viewPDF(q.fileData)}
        title="View PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
      >
        <Eye size={13} /> View
      </button>
      <button
        onClick={() => downloadPDF(q.fileData, q.fileName)}
        title="Download PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-50 text-accent-700 hover:bg-accent-100 transition-colors"
      >
        <Download size={13} /> Download
      </button>
      {onPlaceOrder && (
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
const RFQRow = ({ rfq, onPlaceOrder }) => {
  const [open, setOpen] = useState(false);
  const [quotations, setQuotations] = useState([]);

  const loadQuotations = useCallback(() => {
    setQuotations(getQuotations({ rfqId: rfq.id }));
  }, [rfq.id]);

  useEffect(() => {
    if (open) loadQuotations();
  }, [open, loadQuotations]);

  return (
    <div className="card overflow-hidden">
      {/* RFQ header — clickable to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-900 truncate">{rfq.productName}</p>
            <p className="text-xs text-brand-400">
              Vendor: <span className="text-brand-600">{rfq.vendorName || rfq.vendorEmail}</span>
              {' · '}
              {new Date(rfq.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <RFQStatusBadge status={rfq.status} />
          {rfq.status === 'submitted' && (
            <span className="text-xs text-brand-400 hidden sm:inline">
              {getQuotations({ rfqId: rfq.id }).length} quotation(s)
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-brand-400" /> : <ChevronDown size={16} className="text-brand-400" />}
        </div>
      </button>

      {/* Expanded: notes + quotation PDFs */}
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-surface-100 space-y-3 animate-fade-in">
          {/* Notes */}
          {rfq.notes && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-medium text-amber-700 mb-0.5">Your Notes</p>
              <p className="text-sm text-amber-800">{rfq.notes}</p>
            </div>
          )}

          {/* Quotation PDFs */}
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">
              Submitted Quotations ({quotations.length})
            </p>
            {quotations.length > 0 ? (
              <div className="space-y-2">
                {quotations.map(q => <QuotationCard key={q.id} q={q} onPlaceOrder={(quot) => onPlaceOrder(rfq, quot)} />)}
              </div>
            ) : (
              <div className="p-6 text-center bg-surface-50 rounded-lg border border-dashed border-surface-300">
                <Clock size={24} className="text-brand-200 mx-auto mb-2" />
                <p className="text-sm text-brand-400">Waiting for vendor to submit quotation PDF.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const EMPTY_ORDER = { quantity: '', deliveryAddress: '', deliveryDate: '', notes: '' };

const Quotations = () => {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Place Order modal state
  const [orderRFQ, setOrderRFQ] = useState(null);
  const [orderQuotation, setOrderQuotation] = useState(null);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER);
  const [poFile, setPoFile] = useState(null);
  const [poPreview, setPoPreview] = useState('');
  const [poError, setPoError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const poInputRef = useRef(null);

  const load = () => {
    setRfqs(getRFQs({ manufacturerEmail: user.email }));
  };

  useEffect(() => { load(); }, [user.email]);

  const filtered = rfqs.filter(r =>
    r.productName.toLowerCase().includes(search.toLowerCase()) ||
    (r.vendorName || '').toLowerCase().includes(search.toLowerCase())
  );

  // Sort: submitted (has response) first, then open, then closed
  const sorted = [...filtered].sort((a, b) => {
    const order = { submitted: 0, open: 1, closed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  const openCount = rfqs.filter(r => r.status === 'open').length;
  const submittedCount = rfqs.filter(r => r.status === 'submitted').length;

  // Place Order handlers
  const handlePlaceOrder = (rfq, quotation) => {
    setOrderRFQ(rfq);
    setOrderQuotation(quotation);
    setOrderForm(EMPTY_ORDER);
    setPoFile(null);
    setPoPreview('');
    setPoError('');
  };

  const resetOrderModal = () => {
    setOrderRFQ(null);
    setOrderQuotation(null);
    setOrderForm(EMPTY_ORDER);
    setPoFile(null);
    setPoPreview('');
    setPoError('');
    if (poInputRef.current) poInputRef.current.value = '';
  };

  const handlePoFileChange = (e) => {
    const file = e.target.files[0];
    setPoError('');
    setPoFile(null);
    setPoPreview('');
    if (!file) return;
    if (file.type !== 'application/pdf') { setPoError('Only PDF files are allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { setPoError('File size must be under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setPoFile(file); setPoPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.quantity || parseInt(orderForm.quantity) < 1) { setPoError('Please enter a valid quantity.'); return; }
    if (!orderForm.deliveryAddress.trim()) { setPoError('Delivery address is required.'); return; }
    if (!poPreview) { setPoError('Please upload a Purchase Order (PO) document.'); return; }

    setSubmittingOrder(true);
    try {
      // Step 1: Select the quote on the backend (locks it, closes RFQ)
      await rfqApi.selectQuote(orderRFQ.id, orderQuotation.id);

      // Step 2: Create the order referencing the selected quotation
      // po_document_url: in production this would be a URL from a file upload endpoint.
      // For now we store the base64 preview so it still works in local mode.
      await orderApi.create({
        quotation_id: orderQuotation.id,
        po_document_url: poPreview,                      // base64 PDF (swap with real URL in prod)
        manufacturer_org_id: orderRFQ.manufacturerOrgId, // must be the vendor's org ID from RFQ
        delivery_address: orderForm.deliveryAddress,
        required_by_date: orderForm.deliveryDate || undefined,
        special_instructions: orderForm.notes || undefined,
        currency: 'INR',
        items: [],
      });

      setToast({ message: `Purchase order placed for "${orderRFQ.productName}"! The vendor will review and respond.`, type: 'success' });
      resetOrderModal();
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to place order.', type: 'error' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Quotations</h1>
        <p className="text-sm text-brand-400 mt-1">
          View all RFQs you have sent and quotation PDFs submitted by vendors.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total RFQs', value: rfqs.length, color: 'bg-brand-50 text-brand-700' },
          { label: 'Awaiting Response', value: openCount, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Quotations Received', value: submittedCount, color: 'bg-green-50 text-green-700' },
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
          placeholder="Filter by product name or vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* RFQ list */}
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map(rfq => <RFQRow key={rfq.id} rfq={rfq} onPlaceOrder={handlePlaceOrder} />)}
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
            {/* Order summary */}
            <div className="p-3 bg-surface-100 rounded-lg">
              <p className="text-xs text-brand-500 mb-1">Order Details</p>
              <p className="text-sm font-semibold text-brand-900">{orderRFQ.productName}</p>
              <p className="text-xs text-brand-400">Vendor: {orderRFQ.vendorName || orderRFQ.vendorEmail}</p>
              {orderQuotation && (
                <p className="text-xs text-brand-500 mt-1">Quotation: {orderQuotation.fileName}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                placeholder="Enter quantity"
                value={orderForm.quantity}
                onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                required
              />
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input-field resize-none h-20"
                placeholder="Full delivery address..."
                value={orderForm.deliveryAddress}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                required
              />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Expected Delivery Date
              </label>
              <input
                type="date"
                className="input-field"
                value={orderForm.deliveryDate}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
              />
            </div>

            {/* PO Document Upload */}
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Upload Purchase Order (PO) Document <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => poInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  poFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-brand-200 bg-surface-50 hover:border-brand-400 hover:bg-brand-50'
                }`}
              >
                {poFile ? (
                  <>
                    <FileText size={24} className="text-green-600 mb-1" />
                    <p className="text-sm font-semibold text-green-700 text-center truncate max-w-full">{poFile.name}</p>
                    <p className="text-xs text-green-600 mt-0.5">{(poFile.size / 1024).toFixed(1)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-brand-300 mb-1" />
                    <p className="text-sm font-medium text-brand-600">Click to upload PO (PDF)</p>
                    <p className="text-xs text-brand-400 mt-0.5">PDF only · Max 2 MB</p>
                  </>
                )}
                <input
                  ref={poInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePoFileChange}
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Additional Notes <span className="text-brand-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="input-field resize-none h-16"
                placeholder="Any special instructions..."
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              />
            </div>

            {/* Error */}
            {poError && (
              <div className="flex items-center gap-2 text-red-600 text-xs">
                <AlertCircle size={13} /> {poError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetOrderModal} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-accent" disabled={submittingOrder}>
                <ShoppingCart size={15} />
                {submittingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Quotations;
