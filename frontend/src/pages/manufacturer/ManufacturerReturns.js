import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOrders, createDispute, getDisputes } from '../../utils/storage';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import DisputeDetailCard, { DisputeStatusBadge } from '../../components/common/DisputeDetailCard';
import { Plus, RotateCcw, Package, AlertTriangle, ChevronDown, ChevronUp, Upload, X, AlertCircle, Eye } from 'lucide-react';

const REASONS = [
  { value: 'damaged',        label: 'Item Damaged' },
  { value: 'wrong_item',     label: 'Wrong Item Received' },
  { value: 'quantity_issue', label: 'Quantity Issue' },
  { value: 'delay',          label: 'Delivery Delay' },
  { value: 'other',          label: 'Other' },
];

const EMPTY_FORM = { orderId: '', reason: '', affectedItems: 'full', description: '' };

// ── Dispute list row ──────────────────────────────────────────────────────────
const DisputeRow = ({ dispute, user, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <RotateCcw size={16} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-brand-700">{dispute.rmaNumber}</span>
              <DisputeStatusBadge status={dispute.status} />
            </div>
            <p className="text-sm font-medium text-brand-900 mt-0.5 truncate">{dispute.productName}</p>
            <p className="text-xs text-brand-400">
              Order: <span className="font-mono">{dispute.orderId}</span>
              {' · '}
              {new Date(dispute.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-brand-400 flex-shrink-0" />
          : <ChevronDown size={16} className="text-brand-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t border-surface-100 p-4 animate-fade-in">
          <DisputeDetailCard
            dispute={dispute}
            currentRole="manufacturer"
            currentUser={user}
            onUpdate={onUpdate}
          />
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const ManufacturerReturns = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);
  const [createdRMA, setCreatedRMA] = useState(null);

  // Proof upload state
  const [proofFiles, setProofFiles] = useState([]); // [{file, preview, type}]
  const [proofError, setProofError] = useState('');
  const proofInputRef = useRef(null);

  const load = () => {
    setDisputes(getDisputes({ manufacturerEmail: user.email }));
    setOrders(getOrders({ manufacturerEmail: user.email }).filter(o => o.status === 'accepted' || o.status === 'delivered' || o.status === 'shipped'));
  };

  useEffect(() => { load(); }, []);

  const selectedOrder = orders.find(o => o.id === form.orderId);

  // Proof file handler
  const handleProofFile = (e) => {
    const file = e.target.files[0];
    setProofError('');
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) { setProofError('Only images (JPG, PNG, WEBP, GIF) and PDF files are allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setProofError('File size must be under 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofFiles(prev => [...prev, { file, preview: ev.target.result, type: file.type, name: file.name }]);
    };
    reader.readAsDataURL(file);
    if (proofInputRef.current) proofInputRef.current.value = '';
  };

  const removeProofFile = (idx) => {
    setProofFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.orderId || !form.reason) return;
    if (proofFiles.length === 0) {
      setProofError('Please upload at least one proof file (image or PDF) before submitting.');
      return;
    }

    const dispute = createDispute({
      orderId: form.orderId,
      productName: selectedOrder?.productName || form.orderId,
      vendorEmail: selectedOrder?.vendorEmail || '',
      vendorName: selectedOrder?.vendorName || '',
      manufacturerEmail: user.email,
      manufacturerName: user.name || user.email,
      reason: form.reason,
      affectedItems: form.affectedItems,
      description: form.description,
      proofFiles: proofFiles.map(pf => ({
        fileName: pf.name,
        fileData: pf.preview,
        fileType: pf.type,
      })),
    });

    setCreatedRMA(dispute.rmaNumber);
    setForm(EMPTY_FORM);
    setProofFiles([]);
    setProofError('');
    setShowForm(false);
    setToast({ message: `Return request raised. RMA: ${dispute.rmaNumber}`, type: 'success' });
    load();
  };

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'requested').length,
    investigating: disputes.filter(d => ['acknowledged','investigating'].includes(d.status)).length,
    resolved: disputes.filter(d => ['accepted','rejected','resolved'].includes(d.status)).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Returns & Disputes</h1>
          <p className="text-sm text-brand-400 mt-1">Raise and track return requests against your orders.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-accent flex-shrink-0">
          <Plus size={15} /> Raise Return
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: stats.total,        cls: 'bg-brand-50 text-brand-700' },
          { label: 'Requested',    value: stats.open,         cls: 'bg-yellow-50 text-yellow-700' },
          { label: 'Investigating',value: stats.investigating, cls: 'bg-indigo-50 text-indigo-700' },
          { label: 'Resolved',     value: stats.resolved,     cls: 'bg-green-50 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.cls}`}>
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Created RMA notification */}
      {createdRMA && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <AlertTriangle size={18} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Return Request Submitted</p>
            <p className="text-xs text-green-600">Your RMA number is <strong>{createdRMA}</strong>. Save this for reference.</p>
          </div>
          <button onClick={() => setCreatedRMA(null)} className="ml-auto text-green-500 hover:text-green-700 text-xs">Dismiss</button>
        </div>
      )}

      {/* Dispute list */}
      {disputes.length > 0 ? (
        <div className="space-y-3">
          {[...disputes].reverse().map(d => (
            <DisputeRow key={d.id} dispute={d} user={user} onUpdate={load} />
          ))}
        </div>
      ) : (
        <div className="card p-14 text-center">
          <RotateCcw size={40} className="text-brand-200 mx-auto mb-3" />
          <p className="text-brand-700 font-medium mb-1">No return requests yet</p>
          <p className="text-sm text-brand-400 mb-4">Raise a return request if you received a damaged or incorrect item.</p>
          <button onClick={() => setShowForm(true)} className="btn-accent mx-auto">
            <Plus size={15} /> Raise Return
          </button>
        </div>
      )}

      {/* New Return Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Raise Return Request">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Order select */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">
              Select Order <span className="text-red-500">*</span>
            </label>
            {orders.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex gap-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                No eligible orders. Only accepted/shipped/delivered orders can have return requests.
              </div>
            ) : (
              <select
                className="input-field"
                value={form.orderId}
                onChange={e => setForm({ ...form, orderId: e.target.value })}
                required
              >
                <option value="">Choose an order…</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.productName} — {o.id} ({o.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected order summary */}
          {selectedOrder && (
            <div className="flex items-center gap-2 p-2.5 bg-surface-100 rounded-lg text-xs text-brand-600">
              <Package size={13} />
              <span>{selectedOrder.productName} · Qty: {selectedOrder.quantity} · Vendor: {selectedOrder.vendorName || selectedOrder.vendorEmail}</span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              required
            >
              <option value="">Select reason…</option>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Affected items */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">Affected Items</label>
            <div className="flex gap-3">
              {['full', 'partial'].map(v => (
                <label key={v} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${
                  form.affectedItems === v
                    ? 'bg-brand-800 text-white border-brand-800'
                    : 'bg-white text-brand-600 border-brand-200 hover:border-brand-400'
                }`}>
                  <input type="radio" className="hidden" value={v} checked={form.affectedItems === v}
                    onChange={() => setForm({ ...form, affectedItems: v })} />
                  {v === 'full' ? 'Full Order' : 'Partial'}
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">
              Description <span className="text-brand-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="input-field resize-none h-24"
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Proof Upload (Mandatory) */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">
              Upload Proof <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-brand-400 mb-2">Upload images or PDF showing the issue. At least one file is required.</p>

            {/* Uploaded previews */}
            {proofFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {proofFiles.map((pf, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-surface-50 border border-surface-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      {pf.type.startsWith('image/') ? (
                        <img src={pf.preview} alt={pf.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
                          <Upload size={14} className="text-red-500" />
                        </div>
                      )}
                      <span className="text-xs text-brand-700 truncate">{pf.name}</span>
                    </div>
                    <button type="button" onClick={() => removeProofFile(idx)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              onClick={() => proofInputRef.current?.click()}
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-brand-200 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
            >
              <Upload size={15} className="text-brand-400" />
              <span className="text-sm text-brand-500">Click to upload proof (image/PDF · max 5 MB)</span>
            </div>
            <input
              ref={proofInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={handleProofFile}
            />
            {proofError && (
              <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs">
                <AlertCircle size={12} /> {proofError}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-accent" disabled={!form.orderId || !form.reason || proofFiles.length === 0}>
              <RotateCcw size={14} /> Submit Return Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManufacturerReturns;
