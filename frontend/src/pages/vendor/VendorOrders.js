import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOrders, updateOrderStatus, getRFQs, uploadQuotation, getProducts } from '../../utils/storage';
import StatusBadge from '../../components/common/StatusBadge';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import {
  CheckCircle, XCircle, Upload, FileText, Package,
  ShoppingCart, AlertCircle, Clock, ChevronRight
} from 'lucide-react';

// ──────────────────────────────────────────────────
// Tab button
// ──────────────────────────────────────────────────
const Tab = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active
        ? 'border-brand-800 text-brand-900'
        : 'border-transparent text-brand-400 hover:text-brand-700'
    }`}
  >
    <Icon size={15} />
    {label}
    {count > 0 && (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
        active ? 'bg-brand-800 text-white' : 'bg-brand-100 text-brand-600'
      }`}>
        {count}
      </span>
    )}
  </button>
);

// ──────────────────────────────────────────────────
// RFQ status badge
// ──────────────────────────────────────────────────
const RFQBadge = ({ status }) => {
  const map = {
    open: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ──────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────
const VendorOrders = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('orders');   // 'orders' | 'rfqs'
  const [orders, setOrders] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [toast, setToast] = useState(null);

  // PDF upload modal state
  const [uploadRFQ, setUploadRFQ] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    setOrders(getOrders({ vendorEmail: user.email }));
    // Get all products by this vendor, then get RFQs targeting those products
    const myProducts = getProducts(user.email);
    const myProductIds = myProducts.map(p => p.id);
    const allRFQs = getRFQs({ vendorEmail: user.email });
    setRfqs(allRFQs);
  };

  useEffect(() => { load(); }, []);

  // ── Order actions ──
  const handleOrderAction = (id, status) => {
    updateOrderStatus(id, status);
    setToast({ message: `Order ${status}.`, type: 'success' });
    load();
  };

  // ── PDF file selection & validation ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadError('');
    setPdfFile(null);
    setPdfPreview('');

    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be under 5 MB.');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPdfFile(file);
      setPdfPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ── Upload quotation ──
  const handleUpload = (e) => {
    e.preventDefault();
    if (!pdfPreview) { setUploadError('Please select a PDF file.'); return; }

    setUploading(true);
    uploadQuotation({
      rfqId: uploadRFQ.id,
      productId: uploadRFQ.productId,
      productName: uploadRFQ.productName,
      vendorEmail: user.email,
      vendorName: user.name || user.email,
      manufacturerEmail: uploadRFQ.manufacturerEmail,
      manufacturerName: uploadRFQ.manufacturerName,
      fileName: pdfFile.name,
      fileData: pdfPreview,  // base64
    });

    setToast({ message: 'Quotation PDF uploaded successfully!', type: 'success' });
    setUploadRFQ(null);
    setPdfFile(null);
    setPdfPreview('');
    setUploadError('');
    setUploading(false);
    load();
  };

  const resetUploadModal = () => {
    setUploadRFQ(null);
    setPdfFile(null);
    setPdfPreview('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pendingRFQs = rfqs.filter(r => r.status === 'open').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Orders & RFQs</h1>
        <p className="text-sm text-brand-400 mt-1">Manage purchase orders and quotation requests from manufacturers.</p>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-surface-200 overflow-x-auto">
          <Tab active={tab === 'orders'} onClick={() => setTab('orders')} icon={ShoppingCart} label="Purchase Orders" count={orders.filter(o => o.status === 'pending').length} />
          <Tab active={tab === 'rfqs'} onClick={() => setTab('rfqs')} icon={FileText} label="RFQ Requests" count={pendingRFQs} />
        </div>

        {/* ── Orders Tab ── */}
        {tab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 text-brand-600">
                  <th className="text-left px-5 py-3 font-medium">Order ID</th>
                  <th className="text-left px-5 py-3 font-medium">Product</th>
                  <th className="text-left px-5 py-3 font-medium">Manufacturer</th>
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
                    <td className="px-5 py-3 text-brand-500">{o.manufacturerEmail}</td>
                    <td className="px-5 py-3 text-brand-600">{o.quantity}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-brand-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.status === 'pending' && (
                          <>
                            <button onClick={() => handleOrderAction(o.id, 'accepted')} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Accept">
                              <CheckCircle size={15} />
                            </button>
                            <button onClick={() => handleOrderAction(o.id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-brand-400">No orders received yet.</td></tr>
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
                <p className="text-sm text-brand-300 mt-1">When manufacturers request quotations for your products, they will appear here.</p>
              </div>
            ) : (
              rfqs.map(rfq => (
                <div key={rfq.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-900 truncate">{rfq.productName}</p>
                      <p className="text-xs text-brand-400">
                        From: <span className="text-brand-600 font-medium">{rfq.manufacturerName || rfq.manufacturerEmail}</span>
                        {' · '}
                        {new Date(rfq.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {rfq.notes && (
                        <p className="text-xs text-brand-500 mt-0.5 truncate max-w-xs">
                          Notes: {rfq.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <RFQBadge status={rfq.status} />
                    {rfq.status === 'open' ? (
                      <button
                        onClick={() => setUploadRFQ(rfq)}
                        className="btn-accent text-xs py-2"
                      >
                        <Upload size={13} />
                        Upload Quotation PDF
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                        <CheckCircle size={13} />
                        Submitted
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── PDF Upload Modal ── */}
      <Modal open={!!uploadRFQ} onClose={resetUploadModal} title="Upload Quotation PDF">
        {uploadRFQ && (
          <form onSubmit={handleUpload} className="space-y-4">
            {/* RFQ summary */}
            <div className="p-3 bg-surface-100 rounded-lg">
              <p className="text-xs text-brand-500 mb-1">RFQ Details</p>
              <p className="text-sm font-semibold text-brand-900">{uploadRFQ.productName}</p>
              <p className="text-xs text-brand-400">Requested by: {uploadRFQ.manufacturerName || uploadRFQ.manufacturerEmail}</p>
              {uploadRFQ.notes && (
                <p className="text-xs text-brand-500 mt-1 italic">"{uploadRFQ.notes}"</p>
              )}
            </div>

            {/* File drop zone */}
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Quotation PDF <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  pdfFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-brand-200 bg-surface-50 hover:border-brand-400 hover:bg-brand-50'
                }`}
              >
                {pdfFile ? (
                  <>
                    <FileText size={28} className="text-green-600 mb-2" />
                    <p className="text-sm font-semibold text-green-700 text-center truncate max-w-full">{pdfFile.name}</p>
                    <p className="text-xs text-green-600 mt-0.5">{(pdfFile.size / 1024).toFixed(1)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} className="text-brand-300 mb-2" />
                    <p className="text-sm font-medium text-brand-600">Click to upload PDF</p>
                    <p className="text-xs text-brand-400 mt-0.5">PDF only · Max 5 MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Validation error */}
              {uploadError && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-xs">
                  <AlertCircle size={13} />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <Clock size={13} className="mt-0.5 flex-shrink-0" />
              <span>Once uploaded, the manufacturer will be able to view and download your quotation PDF from their <strong>Quotations</strong> page.</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetUploadModal} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                className="btn-accent"
                disabled={uploading || !pdfFile}
              >
                <Upload size={15} />
                {uploading ? 'Uploading...' : 'Submit Quotation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default VendorOrders;
