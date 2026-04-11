import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRFQs, getQuotations } from '../../utils/storage';
import Toast from '../../components/common/Toast';
import {
  Search, FileText, Download, Eye, ChevronDown, ChevronUp,
  Package, Clock, CheckCircle, Inbox
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
const QuotationCard = ({ q }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-surface-200 rounded-lg hover:border-brand-300 transition-colors">
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
    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
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
    </div>
  </div>
);

// ── RFQ accordion row ────────────────────────────────────────────────────────
const RFQRow = ({ rfq }) => {
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
                {quotations.map(q => <QuotationCard key={q.id} q={q} />)}
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
const Quotations = () => {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [search, setSearch] = useState('');
  const [toast] = useState(null);

  useEffect(() => {
    setRfqs(getRFQs({ manufacturerEmail: user.email }));
  }, [user.email]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => {}} />}

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
          {sorted.map(rfq => <RFQRow key={rfq.id} rfq={rfq} />)}
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
    </div>
  );
};

export default Quotations;
