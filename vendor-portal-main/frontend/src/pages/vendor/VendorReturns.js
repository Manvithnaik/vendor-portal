import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Toast from '../../components/common/Toast';
import {
  RotateCcw, Eye, X, CheckCircle, XCircle, Upload,
  ShieldCheck, AlertTriangle, CheckCircle2, Inbox, Truck, Clock, ArrowLeft, Package, Loader2
} from 'lucide-react';
import Modal from '../../components/common/Modal';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const MAX_EVIDENCE = 2;

/* ── helpers ─────────────────────────────────────────────────────────────── */
const toAbsUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  try {
    const url = new URL(API_BASE);
    return `${url.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  } catch (e) {
    return path;
  }
};

const statusColor = {
  'Dispute Raised': 'bg-red-100 text-red-700',
  'Under Review':   'bg-yellow-100 text-yellow-700',
  'Accepted':       'bg-green-100 text-green-700',
  'Rejected':       'bg-red-100 text-red-700',
  'Return Shipped': 'bg-blue-100 text-blue-700',
  'Dispute Closed': 'bg-surface-200 text-brand-500',
};
 
const stepBadge = {
  'Dispute Raised': { label: 'Acknowledge dispute', color: 'text-red-700 font-semibold' },
  'Under Review':   { label: 'Investigate & Decide', color: 'text-yellow-600 font-semibold' },
  'Accepted':       { label: 'Waiting for shipping', color: 'text-brand-400' },
  'Rejected':       { label: 'Action required: Close', color: 'text-red-700 font-semibold underline' },
  'Return Shipped': { label: 'Action required: Close', color: 'text-blue-700 font-semibold underline' },
  'Dispute Closed': { label: 'Dispute Closed', color: 'text-brand-400' },
};

const TERMINAL = new Set(['Dispute Closed']);

/* ── Workflow step indicator ─────────────────────────────────────────────── */
const STEPS = [
  { key: 'raised',   label: 'Raised',      statuses: ['Dispute Raised'] },
  { key: 'review',   label: 'Acknowledged', statuses: ['Under Review'] },
  { key: 'decided',  label: 'Decision',    statuses: ['Accepted', 'Rejected'] },
  { key: 'resolved', label: 'Resolved',    statuses: ['Return Shipped', 'Dispute Closed'] },
];

function stepIndex(status) {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
}

const StepIndicator = ({ status }) => {
  const current = stepIndex(status);
  const resolved = status === 'Dispute Closed';
  const rejected = status === 'Rejected';

  return (
    <div className="flex items-center gap-0 mb-5">
      {STEPS.map((step, idx) => {
        const done         = idx < current || (resolved && idx === 3);
        const active       = idx === current && !resolved;
        const isLast       = idx === STEPS.length - 1;
        const stepRejected = rejected && idx === 2;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center" style={{ flex: '0 0 auto' }}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${done         ? 'bg-brand-600 border-brand-600 text-white'
                : stepRejected ? 'bg-red-500 border-red-500 text-white'
                : active       ? 'bg-brand-100 border-brand-600 text-brand-700'
                :                'bg-surface-100 border-surface-300 text-brand-300'}`}
              >
                {done || (resolved && idx === 3) ? <CheckCircle2 size={14} /> : stepRejected ? <XCircle size={14} /> : idx + 1}
              </div>
              <span className={`text-[10px] mt-1 text-center font-medium whitespace-nowrap
                ${done         ? 'text-brand-600'
                : stepRejected ? 'text-red-500'
                : active       ? 'text-brand-700'
                :                'text-brand-300'}`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-14px] ${done ? 'bg-brand-400' : 'bg-surface-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Evidence gallery ────────────────────────────────────────────────────── */
const EvidenceGallery = ({ urls, label, bgColor = 'bg-surface-50', borderColor = 'border-surface-200' }) => {
  const absUrls = (urls || []).map(toAbsUrl).filter(Boolean);
  if (!absUrls.length) return null;
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-3 space-y-2`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {absUrls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={`${label} ${i + 1}`}
              className="h-28 rounded-lg border border-surface-200 object-contain hover:opacity-85 transition-opacity shadow-sm"
              onError={e => { e.target.onerror = null; e.target.alt = 'Image unavailable'; }}
            />
          </a>
        ))}
      </div>
    </div>
  );
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ── Component ───────────────────────────────────────────────────────────── */
const VendorReturns = () => {
  const [disputes, setDisputes]             = useState([]);
  const [toast, setToast]                   = useState(null);
  const [selected, setSelected]             = useState(null);
  const [actionView, setActionView]         = useState('');     // '' | 'accept' | 'reject' | 'evidence'
  const [comment, setComment]               = useState('');
  const [evidenceFiles, setEvidenceFiles]   = useState([]);     // [{ file, preview }]
  const [submitting, setSubmitting]         = useState(false);
  const [loading, setLoading]               = useState(true);
  const [openingDetail, setOpeningDetail]   = useState(null); // ID of the dispute being opened

  const load = async () => {
    try {
      const res = await apiClient.get('/disputes/list');
      const list = res?.data || [];
      setDisputes(list);
      if (selected) {
        const updated = list.find(d => d.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) {
      setToast({ message: e.message || 'Failed to load disputes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const openModal = (d) => {
    setSelected(d);
    setActionView('');
    setComment('');
    setEvidenceFiles([]);
  };

  const handleEvidenceFiles = (e) => {
    const selected = Array.from(e.target.files);
    const remaining = MAX_EVIDENCE - evidenceFiles.length;
    const toAdd = selected.slice(0, remaining);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setEvidenceFiles(prev => [...prev, { file, preview: reader.result }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeEvidenceFile = (idx) =>
    setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));

  const doAction = async (action) => {
    if (!selected) return;

    if (action === 'reject' && !comment.trim()) {
      setToast({ message: 'A comment is mandatory when rejecting.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setToast({ message: 'Processing your request...', type: 'info' });
    try {
      let evidence_urls;

      if (action === 'counter_evidence') {
        if (!evidenceFiles.length) {
          setToast({ message: 'Please select at least one image.', type: 'error' });
          setSubmitting(false);
          return;
        }
        evidence_urls = [];
        for (const { file } of evidenceFiles) {
          const fd = new FormData();
          fd.append('file', file);
          
          const uploadRes = await apiClient.post('/uploads/image', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (uploadRes?.data?.file_url) {
            evidence_urls.push(uploadRes.data.file_url);
          } else {
            throw new Error('Upload failed: No URL returned');
          }
        }
      }

      await apiClient.put(`/disputes/update/${selected.id}`, {
        action,
        comment: comment.trim() || undefined,
        evidence_urls,
      });

      setToast({ message: `Dispute ${action.replace(/_/g, ' ')} successfully.`, type: 'success' });
      setActionView('');
      setComment('');
      setEvidenceFiles([]);
      await load();
      setSelected(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Action failed.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Disputes & Returns</h1>
        <p className="text-sm text-brand-400 mt-1">Review and resolve product disputes from manufacturers.</p>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 text-brand-600">
                <th className="text-left px-5 py-3 font-medium">Order</th>
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Raised</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading ? (
                // Skeleton Rows
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-surface-200 rounded w-16"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-surface-200 rounded w-32"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-surface-200 rounded w-20"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-surface-200 rounded w-24"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-surface-200 rounded w-24"></div></td>
                    <td className="px-5 py-4 text-right"><div className="h-8 bg-surface-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                disputes.map(d => (
                  <tr
                    key={d.id}
                    className={`hover:bg-surface-50 transition-colors ${TERMINAL.has(d.status) ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-brand-500">{d.order_number || d.id}</td>
                    <td className="px-5 py-3 font-medium text-brand-800">{d.product_name}</td>
                    <td className="px-5 py-3 text-brand-500">{d.dispute_type}</td>
                    <td className="px-5 py-3 text-xs text-brand-400">{fmtDate(d.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[d.status] || 'bg-surface-100 text-brand-600'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openModal(d)}
                        disabled={!!openingDetail}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50"
                      >
                        {openingDetail === d.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Eye size={13} />
                        )}
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {!loading && disputes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <RotateCcw size={36} className="text-brand-200 mx-auto mb-3" />
                    <p className="text-brand-400 text-sm">No disputes at this time.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Dispute — ${selected.dispute_type}` : 'Dispute Details'}
        size="2xl"
      >
        {selected && (
          <div className="space-y-6">
            {/* Header info (replaces the custom header in the Modal component) */}
            <div className="flex items-center justify-between -mt-2 mb-4">
              <p className="text-xs text-brand-400">
                Order {selected.order_number || selected.id} · {selected.product_name}
              </p>

              {/* NEW: View PO Button */}
              {selected.po_document_url && (
                <a
                  href={toAbsUrl(selected.po_document_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-100 text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors border border-surface-200 flex items-center gap-1.5"
                >
                  <Package size={14} /> View PO
                </a>
              )}
            </div>

            {/* Step indicator */}
            <StepIndicator status={selected.status} />

            {/* Status pill + ACK badge */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColor[selected.status] || 'bg-surface-100 text-brand-600'}`}>
                {selected.status}
              </span>
              {selected.acknowledged && selected.status !== 'Under Review' && (
                <span className="text-xs text-brand-400 flex items-center gap-1">
                  <ShieldCheck size={13} className="text-green-500" /> Acknowledged
                </span>
              )}
            </div>

            {/* Manufacturer's claim */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Manufacturer's Claim</p>
              <p className="text-sm text-red-800">{selected.reason}</p>
              <EvidenceGallery
                urls={selected.image_urls}
                label="Evidence submitted by manufacturer"
                bgColor="bg-red-50"
                borderColor="border-red-100"
              />
            </div>

            {/* Your counter-evidence (if any already submitted) */}
            {selected.vendor_evidence_urls?.length > 0 && (
              <EvidenceGallery
                urls={selected.vendor_evidence_urls}
                label="Your counter-evidence"
                bgColor="bg-blue-50"
                borderColor="border-blue-100"
              />
            )}

            {/* Your comment (if already added) */}
            {selected.vendor_comment && (
              <div className="bg-surface-50 border border-surface-200 rounded-xl p-4">
                <p className="text-xs font-bold text-brand-500 uppercase tracking-wide mb-1">Your comment</p>
                <p className="text-sm text-brand-700">{selected.vendor_comment}</p>
              </div>
            )}

            {/* ══ ACTIONS by lifecycle step ══ */}
            {/* Step 2: Acknowledge */}
            {selected.status === 'Dispute Raised' && !actionView && (
              <div className="border-t border-surface-200 pt-5 space-y-3">
                <h4 className="text-sm font-bold text-brand-900">Step 1 — Acknowledge Receipt</h4>
                <p className="text-xs text-brand-500">Confirm that you have received this dispute and will investigate.</p>
                <button
                  disabled={submitting}
                  onClick={() => doAction('acknowledge')}
                  className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Processing…' : '✓ Acknowledge Dispute'}
                </button>
              </div>
            )}

            {/* Steps 3 + 4: Under Review */}
            {selected.status === 'Under Review' && (
              <div className="border-t border-surface-200 pt-5 space-y-4">
                <h4 className="text-sm font-bold text-brand-900">Step 2 — Investigate & Decide</h4>

                {/* Sub-action picker */}
                {!actionView && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setActionView('evidence')}
                      className="flex-1 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload size={15} /> Add Counter-Evidence
                    </button>
                    <button
                      onClick={() => setActionView('accept')}
                      className="flex-1 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={15} /> Accept
                    </button>
                    <button
                      onClick={() => setActionView('reject')}
                      className="flex-1 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                )}

                {/* Counter-evidence upload — multi-file */}
                {actionView === 'evidence' && (
                  <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-brand-900">Upload Counter-Evidence</p>
                      <button onClick={() => { setActionView(''); setEvidenceFiles([]); }} className="text-xs text-brand-500 underline hover:text-brand-700">Cancel</button>
                    </div>

                    {/* Thumbnails */}
                    {evidenceFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {evidenceFiles.map((item, idx) => (
                          <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-surface-200 bg-surface-100">
                            <img src={item.preview} alt={`ev-${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeEvidenceFile(idx)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Drop zone / add-more */}
                    {evidenceFiles.length < MAX_EVIDENCE && (
                      <div className="relative border-2 border-dashed border-surface-300 rounded-xl p-5 text-center hover:bg-white transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEvidenceFiles}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload size={22} className="mx-auto mb-1.5 text-brand-400" />
                        <p className="text-sm text-brand-600">
                          {evidenceFiles.length === 0
                            ? `Click or drag images here (up to ${MAX_EVIDENCE})`
                            : `Add more (${MAX_EVIDENCE - evidenceFiles.length} remaining)`}
                        </p>
                      </div>
                    )}

                    <button
                      disabled={!evidenceFiles.length || submitting}
                      onClick={() => doAction('counter_evidence')}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Uploading…' : `Submit ${evidenceFiles.length || ''} Counter-Evidence`}
                    </button>
                  </div>
                )}

                {/* Accept form */}
                {actionView === 'accept' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-green-900">Accept Dispute</p>
                      <button onClick={() => { setActionView(''); setComment(''); }} className="text-xs text-brand-500 underline hover:text-brand-700">Cancel</button>
                    </div>
                    <textarea
                      className="input-field min-h-[90px] bg-white"
                      placeholder="Optional comment for the manufacturer…"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                    <button
                      disabled={submitting}
                      onClick={() => doAction('accept')}
                      className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Processing…' : 'Confirm Acceptance'}
                    </button>
                  </div>
                )}

                {/* Reject form */}
                {actionView === 'reject' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-red-900">Reject Dispute</p>
                      <button onClick={() => { setActionView(''); setComment(''); }} className="text-xs text-brand-500 underline hover:text-brand-700">Cancel</button>
                    </div>
                    <div className="flex items-start gap-2 bg-red-100 text-red-700 text-xs rounded-lg p-2.5">
                      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                      A comment is mandatory when rejecting.
                    </div>
                    <textarea
                      className="input-field min-h-[90px] bg-white border-red-200"
                      placeholder="Explain why you are rejecting this dispute… (required)"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      required
                    />
                    <button
                      disabled={submitting || !comment.trim()}
                      onClick={() => doAction('reject')}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Processing…' : 'Confirm Rejection'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Accepted → waiting for manufacturer to ship */}
                   {/* Return Shipped → vendor can close */}
            {selected.status === 'Return Shipped' && (
              <div className="border-t border-surface-200 pt-5 bg-blue-50/60 -mx-6 px-6 pb-6 rounded-b-2xl space-y-3">
                <div className="flex items-center gap-2 mb-1 px-6">
                  <Truck size={16} className="text-blue-600" />
                  <p className="text-sm font-bold text-blue-900">Return Received?</p>
                </div>
                <p className="text-xs text-blue-700 px-6">The manufacturer has shipped the return. Once you receive and verify it, you can close this dispute.</p>
                <div className="px-6">
                  <button
                    disabled={submitting}
                    onClick={() => doAction('close')}
                    className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Closing…' : '✓ Receive & Close Dispute'}
                  </button>
                </div>
              </div>
            )}
 
            {/* Rejected → vendor can close */}
            {selected.status === 'Rejected' && (
              <div className="border-t border-surface-200 pt-5 bg-surface-50 -mx-6 px-6 pb-6 rounded-b-2xl space-y-3">
                <div className="flex items-center gap-2 mb-1 px-6">
                  <Clock size={15} className="text-brand-400" />
                  <p className="text-sm font-bold text-brand-700">Dispute Rejected</p>
                </div>
                <p className="text-xs text-brand-500 px-6">
                  You have rejected this dispute. You can now close it to archive the record.
                </p>
                <div className="px-6">
                  <button
                    disabled={submitting}
                    onClick={() => doAction('close')}
                    className="w-full py-2.5 rounded-xl bg-surface-700 hover:bg-surface-800 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Closing…' : 'Finalize & Close'}
                  </button>
                </div>
              </div>
            )}
 
            {/* Dispute Closed — both sides done */}
            {selected.status === 'Dispute Closed' && (
              <div className="border-t border-surface-200 pt-5 bg-surface-50 -mx-6 px-6 pb-6 rounded-b-2xl">
                <div className="flex items-center gap-2 mb-1 px-6">
                  <Inbox size={16} className="text-brand-400" />
                  <p className="text-sm font-bold text-brand-600">Dispute Closed</p>
                </div>
                <p className="text-xs text-brand-400 px-6">
                  This dispute is now fully closed and archived.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VendorReturns;
