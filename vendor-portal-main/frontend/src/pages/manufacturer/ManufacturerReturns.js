import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import Toast from '../../components/common/Toast';
import { RotateCcw, Plus, Eye, X, Package, Truck, CheckCircle2, Clock, AlertCircle, XCircle, Inbox, ArrowLeft, Loader2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { toAbsUrl } from '../../utils/url';
import { getProductSummary } from '../../utils/orderUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// toAbsUrl removed and imported from utils

const statusColor = {
  'Dispute Raised': 'bg-red-100 text-red-700',
  'Under Review':   'bg-yellow-100 text-yellow-700',
  'Accepted':       'bg-green-100 text-green-700',
  'Rejected':       'bg-red-100 text-red-700',
  'Return Shipped': 'bg-blue-100 text-blue-700',
  'Dispute Closed': 'bg-surface-200 text-brand-500',
};

const stepBadge = {
  'Dispute Raised': { label: 'Awaiting vendor', color: 'text-brand-400' },
  'Under Review':   { label: 'Vendor reviewing', color: 'text-yellow-600' },
  'Accepted':       { label: 'Action required', color: 'text-green-700 font-semibold' },
  'Rejected':       { label: 'Awaiting vendor closure', color: 'text-brand-400' },
  'Return Shipped': { label: 'Awaiting vendor', color: 'text-blue-600' },
  'Dispute Closed': { label: 'Dispute Closed', color: 'text-brand-400' },
};

const TERMINAL = new Set(['Dispute Closed']);

// ── Workflow step indicator ────────────────────────────────────────────────────
const STEPS = [
  { key: 'raised',    label: 'Raised',      statuses: ['Dispute Raised'] },
  { key: 'review',    label: 'Acknowledged', statuses: ['Under Review'] },
  { key: 'decided',   label: 'Decision',    statuses: ['Accepted', 'Rejected'] },
  { key: 'resolved',  label: 'Resolved',    statuses: ['Return Shipped', 'Dispute Closed'] },
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
        const done    = idx < current || (resolved && idx === 3);
        const active  = idx === current && !resolved;
        const isLast  = idx === STEPS.length - 1;
        const stepRejected = rejected && idx === 2;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center min-w-0" style={{ flex: '0 0 auto' }}>
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
              <div className={`flex-1 h-0.5 mx-1 mt-[-14px]
                ${done ? 'bg-brand-400' : 'bg-surface-200'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Evidence image gallery ─────────────────────────────────────────────────────
const EvidenceGallery = ({ urls, label, borderColor = 'border-surface-200', bgColor = 'bg-surface-50' }) => {
  const absUrls = (urls || []).map(toAbsUrl).filter(Boolean);
  if (!absUrls.length) return null;
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-3 space-y-2`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {absUrls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={url}
              alt={`${label} ${i + 1}`}
              className="h-28 rounded-lg border border-surface-200 object-contain hover:opacity-85 transition-opacity shadow-sm"
              onError={e => { e.target.onerror = null; e.target.alt = 'Unavailable'; }}
            />
          </a>
        ))}
      </div>
    </div>
  );
};

// ── Date formatter ─────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Component ──────────────────────────────────────────────────────────────────
const ManufacturerReturns = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openingDetail, setOpeningDetail] = useState(null);

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

  const openModal = (d) => {
    setSelected(d);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const doAction = async (action) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/disputes/update/${selected.id}`, { action });
      setToast({ message: `Action "${action.replace('_', ' ')}" completed.`, type: 'success' });
      await load();
      setSelected(null);
    } catch (err) {
      setToast({ message: err.message || 'Action failed.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Disputes & Returns</h1>
          <p className="text-sm text-brand-400 mt-1">Track and manage your product dispute requests.</p>
        </div>
        <button
          onClick={() => navigate('/manufacturer/raise-dispute')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Raise Dispute
        </button>
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
                <th className="text-right px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading ? (
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
                    <td className="px-5 py-3 font-medium text-brand-800">{getProductSummary(d)}</td>
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
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <RotateCcw size={36} className="text-brand-200 mx-auto mb-3" />
                    <p className="text-brand-400 text-sm">No disputes yet. Click "Raise Dispute" to get started.</p>
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
        title="Dispute Details"
        size="2xl"
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between -mt-2 mb-4">
              <p className="text-xs text-brand-400">
                Order {selected.order_number || selected.id} · {getProductSummary(selected)}
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

            {/* Status pill */}
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full inline-block ${statusColor[selected.status] || 'bg-surface-100 text-brand-600'}`}>
              {selected.status}
            </span>

            {/* Your original dispute */}
            <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-brand-500 uppercase tracking-wide">Your Dispute</p>
              <p className="text-sm"><span className="font-medium text-brand-700">Type:</span> {selected.dispute_type}</p>
              <p className="text-sm"><span className="font-medium text-brand-700">Reason:</span> {selected.reason}</p>
              {(selected.image_urls?.length > 0) && (
                <EvidenceGallery
                  urls={selected.image_urls}
                  label="Your evidence"
                  bgColor="bg-white"
                  borderColor="border-surface-100"
                />
              )}
            </div>

            {/* Vendor's counter-evidence */}
            {selected.vendor_evidence_urls?.length > 0 && (
              <EvidenceGallery
                urls={selected.vendor_evidence_urls}
                label="Vendor's counter-evidence"
                bgColor="bg-blue-50"
                borderColor="border-blue-100"
              />
            )}

            {/* Vendor's decision comment */}
            {selected.vendor_comment && (
              <div className="bg-surface-50 border border-surface-200 rounded-xl p-4">
                <p className="text-xs font-bold text-brand-500 uppercase tracking-wide mb-1">Reason for {selected.status === 'Rejected' ? 'Rejection' : 'Decision'}</p>
                <p className="text-sm text-brand-800">{selected.vendor_comment}</p>
              </div>
            )}

            {/* ══ Step 6 actions ══ */}
            {/* Accepted → Manufacturer confirms Return Shipped */}
            {selected.status === 'Accepted' && (
              <div className="border-t border-surface-200 pt-5 bg-green-50/50 -mx-6 px-6 pb-6 rounded-b-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <p className="text-sm font-bold text-green-900">Your dispute was accepted!</p>
                </div>
                <p className="text-xs text-green-700">
                  Please ship the item back to the vendor and click below to confirm.
                </p>
                <button
                  disabled={submitting}
                  onClick={() => doAction('return_shipped')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Truck size={16} />
                  {submitting ? 'Processing…' : 'Mark as Return Shipped'}
                </button>
              </div>
            )}

            {/* Return Shipped → waiting for vendor */}
            {selected.status === 'Return Shipped' && (
              <div className="border-t border-surface-200 pt-5 bg-blue-50/50 -mx-6 px-6 pb-6 rounded-b-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Truck size={16} className="text-blue-600" />
                  <p className="text-sm font-bold text-blue-900">Return In Transit</p>
                </div>
                <p className="text-xs text-blue-700">The vendor will process your return upon receipt. No further action needed.</p>
              </div>
            )}

            {/* Rejected → Manufacturer sees reason, awaiting vendor to close or just archived */}
            {selected.status === 'Rejected' && (
              <div className="border-t border-surface-200 pt-5 bg-red-50/50 -mx-6 px-6 pb-6 rounded-b-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-500" />
                  <p className="text-sm font-bold text-red-900">Your dispute was rejected.</p>
                </div>
                <p className="text-xs text-red-700">
                  The vendor has rejected this dispute and provided a reason above.
                </p>
              </div>
            )}

            {/* Dispute Closed */}
            {selected.status === 'Dispute Closed' && (
              <div className="border-t border-surface-200 pt-5 bg-surface-50 -mx-6 px-6 pb-6 rounded-b-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Inbox size={16} className="text-brand-400" />
                  <p className="text-sm font-bold text-brand-600">Dispute Closed</p>
                </div>
                <p className="text-xs text-brand-400">This dispute has been closed and archived.</p>
              </div>
            )}

            {/* Dispute Raised / Under Review — no action for manufacturer */}
            {(selected.status === 'Dispute Raised' || selected.status === 'Under Review') && (
              <div className="border-t border-surface-200 pt-5">
                <div className="flex items-center gap-2 text-brand-500">
                  <Clock size={15} />
                  <p className="text-xs">
                    {selected.status === 'Dispute Raised'
                      ? 'Waiting for the vendor to acknowledge your dispute.'
                      : 'The vendor is reviewing your dispute. No action needed yet.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManufacturerReturns;
