import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import DetailDrawer from '../../components/common/DetailDrawer';
import Toast from '../../components/common/Toast';
import { CheckCircle, XCircle, RotateCcw, User, Calendar, Mail, ExternalLink } from 'lucide-react';

// ── Shared helpers (same as VendorApplications) ───────────────────
const IGNORE_FIELDS = ['id','created_at','updated_at','verification_status','verification_certificates',
  'org_type','businessDoc','businessDocData','business_doc','business_doc_data',
  'password_hash','is_active','is_verified','logo_url','overall_rating'];

const FIELD_LABELS = {
  name:'Business Name', email:'Email Address', phone:'Phone Number',
  address_line1:'Address Line 1', address_line2:'Address Line 2', city:'City',
  state:'State', postal_code:'Postal Code', country:'Country', website:'Website',
  industry_type:'Business Type / Category', about:'About / Bio',
  factory_address:'Factory Address', contact_name:'Contact Name',
  contact_email:'Contact Email', contact_phone:'Contact Phone',
  authorised_signatory_name:'Auth Signatory Name', authorised_signatory_phone:'Auth Signatory Phone',
};
const fmtLabel    = (k) => FIELD_LABELS[k] || k.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
const fmtDate     = (d) => { if(!d) return '—'; const dd=new Date(d); if(isNaN(dd.getTime())) return '—'; return `${String(dd.getDate()).padStart(2,'0')}/${String(dd.getMonth()+1).padStart(2,'0')}/${dd.getFullYear()}`; };
const fmtLocation = (city,country) => [city,country].filter(Boolean).join(', ') || '—';

// ── ManufacturerApplications ──────────────────────────────────────
const ManufacturerApplications = () => {
  const [apps, setApps]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [action, setAction]       = useState(null);
  const [reason, setReason]       = useState('');
  const [changes, setChanges]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingRes, reviewedRes] = await Promise.all([
        apiClient.get('/organizations/pending-applications'),
        apiClient.get('/organizations/admin/reviewed'),
      ]);
      const pending  = (pendingRes?.data  || []).filter(o => o.org_type === 'customer');
      const reviewed = (reviewedRes?.data || []).filter(o => o.org_type === 'customer');
      setApps([...pending, ...reviewed]);
    } catch {
      setToast({ message: 'Failed to load applications.', type: 'error' });
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startAction = (app, status) => { setAction({ app, status }); setReason(''); setChanges(''); };

  const confirmAction = async () => {
    if (!action) return;
    const { app, status } = action;
    const backendStatus = status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';
    const body = { action: status, reason, changes: changes ? changes.split('\n').filter(l=>l.trim()) : [], deadline: null };
    setSubmitting(true);
    try {
      await apiClient.patch(`/organizations/${app.id}/verification?status=${backendStatus}`, body);
      setToast({ message: status === 'resubmit' ? 'Resubmit request sent.' : `Application ${status}. Email sent.`, type: 'success' });
      setAction(null); setSelected(null); load();
    } catch {
      setToast({ message: '⚠️ Status updated but email could not be sent.', type: 'error' });
    } finally { setSubmitting(false); }
  };

  // ── Drawer body ──────────────────────────────────────────────────
  const DrawerContent = ({ app }) => {
    const certs     = app.verification_certificates || [];
    const docData   = app.businessDocData || app.business_doc_data;
    const docName   = app.businessDoc || app.business_doc || 'Business Doc';
    const extraDocs = [];
    if (docData) extraDocs.push({ name: docName, url: docData });
    if (app.logo_url) extraDocs.push({ name: app.logo_url.split('/').pop() || 'Logo', url: app.logo_url });

    const fields = [];
    Object.entries(app).forEach(([key, value]) => {
      if (IGNORE_FIELDS.includes(key)) return;
      if (key === 'financial_details' && value) {
        Object.entries(value).forEach(([fk, fv]) => {
          if (['id','organization_id'].includes(fk)) return;
          let label = fk;
          if (fk === 'tax_id_encrypted') label = 'GST / Tax Reg. No.';
          else if (fk === 'bank_name') label = 'Bank Name';
          else if (fk === 'account_number_encrypted') label = 'Account Number';
          else if (fk === 'routing_number_encrypted') label = 'IFSC / Routing Code';
          else if (fk === 'account_name') label = 'Account Name';
          else label = fmtLabel(fk);
          if (fv !== null && fv !== undefined && fv !== '') fields.push({ label, value: String(fv) });
        });
      } else if (typeof value !== 'object' && typeof value !== 'function' && value !== null && value !== undefined && value !== '') {
        fields.push({ label: fmtLabel(key), value: String(value) });
      }
    });

    const isApproved = app.verification_status === 'verified' || app.verification_status === 'approved';
    const isRejected = app.verification_status === 'rejected';

    return (
      <div className="space-y-6 text-sm">
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-800 flex items-center justify-center text-white">
              <User size={22} />
            </div>
            <div>
              <p className="font-bold text-brand-900">{app.name}</p>
              <p className="text-xs text-brand-400 flex items-center gap-1"><Mail size={11} />{app.email}</p>
            </div>
          </div>
          <StatusBadge status={app.verification_status} />
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 bg-brand-50/40 rounded-xl border border-surface-200 text-xs">
          <div>
            <p className="text-brand-400 uppercase tracking-wide font-semibold mb-0.5">Submitted</p>
            <p className="font-medium text-brand-800">{fmtDate(app.created_at)}</p>
          </div>
          <div>
            <p className="text-brand-400 uppercase tracking-wide font-semibold mb-0.5">Review Date</p>
            <p className="font-medium text-brand-800">{app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-brand-400 uppercase tracking-wide font-semibold mb-0.5">Reviewed By</p>
            <p className="font-medium text-brand-800">{app.reviewed_by_admin_name || <span className="italic text-brand-300">Not yet reviewed</span>}</p>
          </div>
        </div>

        {fields.length > 0 && (
          <div>
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3 pb-2 border-b border-surface-200">Application Details</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {fields.map((f, i) => (
                <div key={i}>
                  <dt className="text-[11px] uppercase tracking-wide text-brand-400 font-semibold mb-0.5">{f.label}</dt>
                  <dd className="font-medium text-brand-800 break-words">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {(certs.length > 0 || extraDocs.length > 0) && (
          <div>
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3 pb-2 border-b border-surface-200">Uploaded Documents</p>
            <div className="space-y-2">
              {[...certs.filter(c=>c.document_url).map(c=>({name:`${c.issued_by?c.issued_by+' — ':''}${c.document_url.split('/').pop()}`,url:c.document_url})),...extraDocs].map((doc,i)=>(
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-surface-50 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors">
                  <span className="text-sm font-medium text-brand-700 truncate max-w-[calc(100%-2rem)]">{doc.name}</span>
                  <ExternalLink size={14} className="text-brand-400 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-surface-200 space-y-3">
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Actions</p>
          <div className="flex flex-wrap gap-2">
            {!isApproved && (
              <button onClick={() => startAction(app, 'approved')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                <CheckCircle size={15} /> Approve
              </button>
            )}
            {!isRejected && (
              <button onClick={() => startAction(app, 'rejected')}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                <XCircle size={15} /> Reject
              </button>
            )}
            <button onClick={() => startAction(app, 'resubmit')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 border border-orange-200 transition-colors">
              <RotateCcw size={15} /> Request Resubmit
            </button>
          </div>

          {action && action.app.id === app.id && (
            <div className="mt-3 p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-3 animate-fade-in">
              {action.status === 'approved' && <p className="text-sm text-brand-700">Approve this application? An email will be sent to {app.email}.</p>}
              {action.status === 'rejected' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-brand-700">Reason for Rejection <span className="text-red-500">*</span></label>
                  <textarea className="input-field resize-none h-20 text-sm" placeholder="Clearly state why this application is being rejected..." value={reason} onChange={e=>setReason(e.target.value)} />
                </div>
              )}
              {action.status === 'resubmit' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-brand-700">Changes Required <span className="text-red-500">*</span></label>
                  <textarea className="input-field resize-none h-20 text-sm" placeholder="List required changes (one per line)..." value={changes} onChange={e=>setChanges(e.target.value)} />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setAction(null)} className="btn-secondary text-sm flex-1">Cancel</button>
                <button
                  onClick={confirmAction}
                  disabled={submitting || (action.status==='rejected'&&!reason.trim()) || (action.status==='resubmit'&&!changes.trim())}
                  className={`flex-1 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${action.status==='approved'?'bg-green-600 text-white hover:bg-green-700':action.status==='rejected'?'bg-red-600 text-white hover:bg-red-700':'bg-orange-500 text-white hover:bg-orange-600'}`}
                >
                  {submitting ? 'Saving...' : `Confirm ${action.status === 'approved' ? 'Approval' : action.status === 'rejected' ? 'Rejection' : 'Resubmit'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div>
        <h1 className="font-display font-bold text-3xl text-brand-900 tracking-tight">Manufacturer Applications</h1>
        <p className="text-sm text-brand-400 mt-1">Review and manage registration requests from manufacturing partners.</p>
      </div>

      <div className="card shadow-elevated border-brand-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 text-brand-600 border-b border-surface-200 text-xs font-semibold uppercase tracking-wide">
                <th className="text-left px-6 py-3.5">Organization</th>
                <th className="text-left px-6 py-3.5">Location</th>
                <th className="text-left px-6 py-3.5">Status</th>
                <th className="text-left px-6 py-3.5">Submitted</th>
                <th className="text-left px-6 py-3.5">Review Date</th>
                <th className="text-left px-6 py-3.5">Reviewed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-brand-300">Loading applications...</td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-brand-400">No manufacturer applications found.</td></tr>
              ) : apps.map(app => (
                <tr
                  key={app.id}
                  onClick={() => { setSelected(app); setAction(null); }}
                  className="row-clickable border-l-2 border-transparent hover:border-l-brand-500"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-brand-900">{app.name}</p>
                    <p className="text-xs text-brand-400 flex items-center gap-1 mt-0.5"><Mail size={11} />{app.email}</p>
                  </td>
                  <td className="px-6 py-4 text-brand-500">{fmtLocation(app.city, app.country)}</td>
                  <td className="px-6 py-4"><StatusBadge status={app.verification_status} /></td>
                  <td className="px-6 py-4 text-brand-400 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Calendar size={13} />{fmtDate(app.created_at)}</span>
                  </td>
                  <td className="px-6 py-4 text-brand-500 text-xs">
                    {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : <span className="text-brand-300 italic">—</span>}
                  </td>
                  <td className="px-6 py-4 text-brand-600 font-medium">
                    {app.reviewed_by_admin_name || <span className="text-brand-300 italic text-xs">Unreviewed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DetailDrawer
        open={!!selected}
        onClose={() => { setSelected(null); setAction(null); }}
        title={selected?.name || 'Application Details'}
        subtitle={selected?.email}
        width="36rem"
      >
        {selected && <DrawerContent app={selected} />}
      </DetailDrawer>
    </div>
  );
};

export default ManufacturerApplications;
