import React, { useState, useRef } from 'react';
import {
  addDisputeEvidence, respondToDispute,
  updateDisputeStatus, getDisputeById
} from '../../utils/storage';
import {
  Upload, CheckCircle, XCircle,
  FileText, ImageIcon, Film, Download, Eye,
  ChevronDown, ChevronUp, User, Wrench,
  AlertCircle, MessageSquare
} from 'lucide-react';

// ── Status config (no escalated) ──────────────────────────────────────────────
const STATUS_CONFIG = {
  requested:     { color: 'bg-yellow-100 text-yellow-800 border-yellow-200',  dot: 'bg-yellow-500',  label: 'Requested' },
  acknowledged:  { color: 'bg-blue-100 text-blue-800 border-blue-200',        dot: 'bg-blue-500',    label: 'Acknowledged' },
  investigating: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200',  dot: 'bg-indigo-500',  label: 'Investigating' },
  accepted:      { color: 'bg-green-100 text-green-800 border-green-200',     dot: 'bg-green-500',   label: 'Accepted' },
  rejected:      { color: 'bg-red-100 text-red-800 border-red-200',           dot: 'bg-red-500',     label: 'Rejected' },
  resolved:      { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', label: 'Resolved' },
};

export const DisputeStatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ── File icon helper ──────────────────────────────────────────────────────────
const FileIcon = ({ fileType, size = 16 }) => {
  if (fileType?.startsWith('image/')) return <ImageIcon size={size} className="text-indigo-500" />;
  if (fileType?.startsWith('video/')) return <Film size={size} className="text-purple-500" />;
  return <FileText size={size} className="text-red-500" />;
};

// ── Download / view a base64 file ─────────────────────────────────────────────
const downloadFile = (fileData, fileName) => {
  const a = document.createElement('a');
  a.href = fileData;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const viewFile = (fileData, fileType) => {
  const win = window.open();
  if (!win) return;
  if (fileType?.startsWith('image/')) {
    win.document.write(`<img src="${fileData}" style="max-width:100%;display:block;margin:auto;" />`);
  } else if (fileType?.startsWith('video/')) {
    win.document.write(`<video src="${fileData}" controls style="max-width:100%;display:block;margin:auto;"></video>`);
  } else {
    win.document.write(`<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`);
  }
};

// ── Role icon ─────────────────────────────────────────────────────────────────
const RoleIcon = ({ role }) => {
  if (role === 'vendor') return <Wrench size={13} className="text-blue-600" />;
  return <User size={13} className="text-brand-600" />;
};

// ── Timeline ──────────────────────────────────────────────────────────────────
export const DisputeTimeline = ({ timeline = [] }) => (
  <div className="space-y-0">
    {[...timeline].reverse().map((ev, i) => (
      <div key={ev.id} className="flex gap-3 relative">
        {i < timeline.length - 1 && (
          <div className="absolute left-[15px] top-7 bottom-0 w-px bg-surface-200" />
        )}
        <div className="w-8 h-8 rounded-full bg-surface-100 border border-surface-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <RoleIcon role={ev.role} />
        </div>
        <div className="pb-4 min-w-0 flex-1">
          <p className="text-sm font-medium text-brand-900">{ev.action}</p>
          <p className="text-xs text-brand-400 mt-0.5">
            <span className="font-medium text-brand-600">{ev.actor}</span>
            {' · '}
            {new Date(ev.timestamp).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
          {ev.note && <p className="text-xs text-brand-500 mt-1 italic">"{ev.note}"</p>}
        </div>
      </div>
    ))}
  </div>
);

// ── Evidence Section ──────────────────────────────────────────────────────────
export const EvidenceSection = ({ evidence = [], disputeId, currentRole, currentUser, onUpdate }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4', 'video/webm'];
  const MAX_MB = 5;

  const handleFile = (e) => {
    const file = e.target.files[0];
    setUploadError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type)) { setUploadError('Unsupported file type.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setUploadError(`Max ${MAX_MB} MB allowed.`); return; }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      addDisputeEvidence(disputeId, {
        uploadedBy: currentUser.name || currentUser.email,
        role: currentRole,
        fileName: file.name,
        fileData: ev.target.result,
        fileType: file.type,
      });
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUpdate?.();
    };
    reader.readAsDataURL(file);
  };

  const myEvidence = evidence.filter(e => e.role === currentRole);
  const otherEvidence = evidence.filter(e => e.role !== currentRole);

  const EvidenceCard = ({ ev }) => (
    <div className="flex items-center justify-between p-3 bg-white border border-surface-200 rounded-lg hover:border-brand-300 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileIcon fileType={ev.fileType} />
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-900 truncate">{ev.fileName}</p>
          <p className="text-xs text-brand-400">
            {ev.uploadedBy} · {new Date(ev.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0 ml-2">
        <button onClick={() => viewFile(ev.fileData, ev.fileType)}
          className="p-1.5 rounded hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View">
          <Eye size={13} />
        </button>
        <button onClick={() => downloadFile(ev.fileData, ev.fileName)}
          className="p-1.5 rounded hover:bg-accent-50 text-brand-400 hover:text-accent-700" title="Download">
          <Download size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 p-3 border border-dashed border-brand-200 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
        >
          <Upload size={15} className="text-brand-400" />
          <span className="text-sm text-brand-500">
            {uploading ? 'Uploading…' : 'Upload evidence (image, PDF, video · max 5 MB)'}
          </span>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile}
          accept="image/*,application/pdf,video/mp4,video/webm" />
        {uploadError && (
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {uploadError}
          </p>
        )}
      </div>

      {/* My evidence */}
      {myEvidence.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">Your uploads ({myEvidence.length})</p>
          <div className="space-y-2">{myEvidence.map(ev => <EvidenceCard key={ev.id} ev={ev} />)}</div>
        </div>
      )}

      {/* Counter evidence */}
      {otherEvidence.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">
            {currentRole === 'manufacturer' ? 'Vendor' : 'Manufacturer'} uploads ({otherEvidence.length})
          </p>
          <div className="space-y-2">{otherEvidence.map(ev => <EvidenceCard key={ev.id} ev={ev} />)}</div>
        </div>
      )}

      {evidence.length === 0 && (
        <p className="text-xs text-brand-400 text-center py-2">No files uploaded yet.</p>
      )}
    </div>
  );
};

// ── Reason labels ─────────────────────────────────────────────────────────────
const REASON_LABELS = {
  damaged:        'Item Damaged',
  wrong_item:     'Wrong Item Received',
  quantity_issue: 'Quantity Issue',
  delay:          'Delivery Delay',
  other:          'Other',
};

// ── Main DisputeDetailCard ────────────────────────────────────────────────────
const DisputeDetailCard = ({ dispute: initialDispute, currentRole, currentUser, onUpdate }) => {
  const [dispute, setDispute] = useState(initialDispute);
  const [openSection, setOpenSection] = useState('details');
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    const fresh = getDisputeById(dispute.id);
    if (fresh) { setDispute(fresh); onUpdate?.(); }
  };

  const isVendor = currentRole === 'vendor';
  const isClosed = ['resolved', 'accepted', 'rejected'].includes(dispute.status);

  // Vendor: accept return
  const handleAccept = () => {
    setBusy(true);
    respondToDispute(dispute.id, {
      resolution: 'accepted',
      vendorComment: '',
      vendorName: currentUser.name || currentUser.email,
    });
    refresh(); setBusy(false);
  };

  // Vendor: reject return (mandatory comment)
  const handleReject = () => {
    if (!rejectComment.trim()) return;
    setBusy(true);
    respondToDispute(dispute.id, {
      resolution: 'rejected',
      vendorComment: rejectComment,
      vendorName: currentUser.name || currentUser.email,
    });
    setShowRejectInput(false); setRejectComment('');
    refresh(); setBusy(false);
  };

  // Vendor: progress status
  const handleStatusUpdate = (newStatus) => {
    setBusy(true);
    updateDisputeStatus(dispute.id, newStatus, {
      actor: currentUser.name || currentUser.email,
      role: currentRole,
      note: statusNote,
    });
    setStatusNote('');
    refresh(); setBusy(false);
  };

  const Section = ({ id, label, children }) => {
    const isOpen = openSection === id;
    return (
      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpenSection(isOpen ? '' : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 hover:bg-surface-100 transition-colors text-left"
        >
          <span className="text-sm font-semibold text-brand-800">{label}</span>
          {isOpen ? <ChevronUp size={15} className="text-brand-400" /> : <ChevronDown size={15} className="text-brand-400" />}
        </button>
        {isOpen && <div className="px-4 py-4 bg-white">{children}</div>}
      </div>
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-brand-50 to-surface-50 border-b border-surface-200 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">{dispute.rmaNumber}</span>
            <DisputeStatusBadge status={dispute.status} />
          </div>
          <p className="text-sm font-semibold text-brand-900 mt-1.5">{dispute.productName}</p>
          <p className="text-xs text-brand-400 mt-0.5">
            Order: <span className="font-mono">{dispute.orderId}</span>
            {' · '}
            {new Date(dispute.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {dispute.evidence.length > 0 && (
          <span className="text-xs text-brand-400 self-start">{dispute.evidence.length} file(s)</span>
        )}
      </div>

      {/* Accordion sections */}
      <div className="p-4 space-y-2">

        {/* Dispute Details */}
        <Section id="details" label="📋 Dispute Details">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Reason',         value: REASON_LABELS[dispute.reason] || dispute.reason },
              { label: 'Affected Items', value: dispute.affectedItems === 'full' ? 'Full Order' : 'Partial' },
              { label: 'Manufacturer',   value: dispute.manufacturerName || dispute.manufacturerEmail },
              { label: 'Vendor',         value: dispute.vendorName || dispute.vendorEmail },
            ].map(i => (
              <div key={i.label}>
                <dt className="text-xs text-brand-400 font-medium">{i.label}</dt>
                <dd className="text-sm text-brand-900 font-medium mt-0.5">{i.value || '—'}</dd>
              </div>
            ))}
            {dispute.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-brand-400 font-medium">Description</dt>
                <dd className="text-sm text-brand-700 mt-0.5 whitespace-pre-line">{dispute.description}</dd>
              </div>
            )}
          </dl>
        </Section>

        {/* Evidence */}
        <Section id="evidence" label={`📎 Evidence (${dispute.evidence.length})`}>
          <EvidenceSection
            evidence={dispute.evidence}
            disputeId={dispute.id}
            currentRole={currentRole}
            currentUser={currentUser}
            onUpdate={refresh}
          />
        </Section>

        {/* Messages / Comments */}
        {dispute.vendorComment && (
          <Section id="comments" label="💬 Comments">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <Wrench size={13} className="text-blue-600" />
              </div>
              <div className="flex-1 bg-surface-50 rounded-xl p-3 border border-surface-200">
                <p className="text-xs font-medium text-brand-600 mb-1">
                  Vendor · {dispute.vendorName || dispute.vendorEmail}
                </p>
                <p className="text-sm text-brand-800 italic">"{dispute.vendorComment}"</p>
              </div>
            </div>
          </Section>
        )}

        {/* Timeline */}
        <Section id="timeline" label={`🕒 Timeline (${dispute.timeline.length} events)`}>
          <DisputeTimeline timeline={dispute.timeline} />
        </Section>

        {/* Actions — vendor only, while dispute is open */}
        {isVendor && !isClosed && (
          <Section id="actions" label="⚡ Actions">
            <div className="space-y-3">

              {/* Respond (requested state) */}
              {dispute.status === 'requested' && (
                <div className="space-y-3">
                  <p className="text-xs text-brand-500">Respond to this return request:</p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={handleAccept} disabled={busy}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                      <CheckCircle size={14} /> Accept Return
                    </button>
                    <button onClick={() => setShowRejectInput(v => !v)} disabled={busy}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors border border-red-200">
                      <XCircle size={14} /> Reject Return
                    </button>
                  </div>
                  {showRejectInput && (
                    <div className="space-y-2">
                      <textarea
                        className="input-field resize-none h-20 text-sm"
                        placeholder="Rejection reason (required)..."
                        value={rejectComment}
                        onChange={e => setRejectComment(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleReject} disabled={!rejectComment.trim() || busy}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                          <XCircle size={13} /> Submit Rejection
                        </button>
                        <button onClick={() => { setShowRejectInput(false); setRejectComment(''); }}
                          className="btn-secondary text-xs">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress status (acknowledged / investigating) */}
              {['acknowledged', 'investigating'].includes(dispute.status) && (
                <div className="space-y-2">
                  <p className="text-xs text-brand-500 font-medium">Update investigation status:</p>
                  <textarea
                    className="input-field resize-none h-16 text-sm"
                    placeholder="Optional note about progress..."
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                  />
                  <div className="flex gap-2 flex-wrap">
                    {dispute.status === 'acknowledged' && (
                      <button onClick={() => handleStatusUpdate('investigating')} disabled={busy}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                        <MessageSquare size={13} /> Mark Investigating
                      </button>
                    )}
                    <button onClick={() => handleStatusUpdate('resolved')} disabled={busy}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                      <CheckCircle size={13} /> Mark Resolved
                    </button>
                  </div>
                </div>
              )}

            </div>
          </Section>
        )}

        {/* Closed state notice */}
        {isClosed && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            dispute.status === 'accepted' || dispute.status === 'resolved'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {dispute.status === 'rejected' ? <XCircle size={15} /> : <CheckCircle size={15} />}
            This dispute has been <strong className="ml-1">{STATUS_CONFIG[dispute.status]?.label}</strong>.
          </div>
        )}

      </div>
    </div>
  );
};

export default DisputeDetailCard;
