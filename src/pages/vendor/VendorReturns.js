import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDisputes } from '../../utils/storage';
import Toast from '../../components/common/Toast';
import DisputeDetailCard, { DisputeStatusBadge } from '../../components/common/DisputeDetailCard';
import { RotateCcw, ChevronDown, ChevronUp, Inbox } from 'lucide-react';

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
              From: <span className="font-medium text-brand-600">{dispute.manufacturerName || dispute.manufacturerEmail}</span>
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
            currentRole="vendor"
            currentUser={user}
            onUpdate={onUpdate}
          />
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const VendorReturns = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all'); // all | pending | resolved

  const load = () => setDisputes(getDisputes({ vendorEmail: user.email }));
  useEffect(() => { load(); }, []);

  const filtered = disputes.filter(d => {
    if (filter === 'pending') return ['requested','acknowledged','investigating'].includes(d.status);
    if (filter === 'resolved') return ['accepted','rejected','resolved'].includes(d.status);
    return true;
  });

  const stats = {
    total: disputes.length,
    pending: disputes.filter(d => d.status === 'requested').length,
    investigating: disputes.filter(d => ['acknowledged','investigating'].includes(d.status)).length,
    resolved: disputes.filter(d => ['accepted','rejected','resolved'].includes(d.status)).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Return Requests</h1>
        <p className="text-sm text-brand-400 mt-1">Review and respond to return/dispute requests from manufacturers.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: stats.total,        cls: 'bg-brand-50 text-brand-700' },
          { label: 'Action Needed',value: stats.pending,      cls: 'bg-yellow-50 text-yellow-700' },
          { label: 'In Progress',  value: stats.investigating,cls: 'bg-indigo-50 text-indigo-700' },
          { label: 'Resolved',     value: stats.resolved,     cls: 'bg-green-50 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.cls}`}>
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 self-start w-fit">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'resolved', label: 'Resolved' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === t.key ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-500 hover:text-brand-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dispute list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {[...filtered].reverse().map(d => (
            <DisputeRow key={d.id} dispute={d} user={user} onUpdate={load} />
          ))}
        </div>
      ) : (
        <div className="card p-14 text-center">
          <Inbox size={40} className="text-brand-200 mx-auto mb-3" />
          <p className="text-brand-700 font-medium mb-1">
            {filter === 'all' ? 'No return requests received yet.' : `No ${filter} disputes.`}
          </p>
          <p className="text-sm text-brand-400">
            Return requests from manufacturers will appear here when raised.
          </p>
        </div>
      )}
    </div>
  );
};

export default VendorReturns;
