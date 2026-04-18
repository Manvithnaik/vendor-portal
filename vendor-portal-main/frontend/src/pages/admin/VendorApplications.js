import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { CheckCircle, XCircle, RotateCcw, Eye } from 'lucide-react';

const VendorApplications = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [viewApp, setViewApp] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionPayload, setActionPayload] = useState({ reason: '', changes: '', deadline: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/organizations/pending-applications');
      const all = res?.data || [];
      setApps(all.filter(o => o.org_type === 'manufacturer'));
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActionClick = (org, status) => {
    setConfirmAction({ app: org, orgId: org.id, status });
    setActionPayload({ reason: '', changes: '', deadline: '' });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { orgId, status } = confirmAction;
    const backendStatus = status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';

    const body = {
      action: status,
      reason: actionPayload.reason,
      changes: actionPayload.changes ? actionPayload.changes.split('\n').filter(l => l.trim()) : [],
      deadline: actionPayload.deadline || null
    };

    try {
      await apiClient.patch(`/organizations/${orgId}/verification?status=${backendStatus}`, body);
      let toastMsg = `Application ${status}. Email notification triggered successfully.`;
      if (status === 'resubmit') toastMsg = 'Status updated to pending and resubmit email sent.';
      setToast({ message: toastMsg, type: 'success' });
      load();
    } catch (err) {
      setToast({ message: `⚠️ Status updated but email could not be sent. Please notify the applicant manually.`, type: 'error' });
    }
    setConfirmAction(null);
  };

  const renderInfoFields = (app) => {
    const fields = [];
    const ignoreFields = ['id', 'created_at', 'updated_at', 'verification_status', 'verification_certificates', 'org_type', 'businessDoc', 'businessDocData', 'business_doc', 'business_doc_data', 'password_hash', 'is_active', 'is_verified', 'logo_url', 'overall_rating'];

    const labels = {
      name: 'Business Name',
      email: 'Email Address',
      phone: 'Phone Number',
      address_line1: 'Address Line 1',
      address_line2: 'Address Line 2',
      city: 'City',
      state: 'State',
      postal_code: 'Postal Code',
      country: 'Country',
      website: 'Website',
      industry_type: 'Business Type / Category',
      about: 'About / Bio',
      factory_address: 'Factory Address',
      contact_name: 'Contact Name',
      contact_email: 'Contact Email',
      contact_phone: 'Contact Phone',
      authorised_signatory_name: 'Auth Signatory Name',
      authorised_signatory_phone: 'Auth Signatory Phone'
    };

    const formatLabel = (k) => {
      if (labels[k]) return labels[k];
      return k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    Object.entries(app).forEach(([key, value]) => {
      if (ignoreFields.includes(key)) return;

      if (key === 'financial_details' && value) {
        Object.entries(value).forEach(([fKey, fVal]) => {
          if (['id', 'organization_id'].includes(fKey)) return;
          let fLabel = fKey;
          if (fKey === 'tax_id_encrypted') fLabel = 'GST / Tax Registration Number';
          else if (fKey === 'bank_name') fLabel = 'Bank Name';
          else if (fKey === 'account_number_encrypted') fLabel = 'Bank Account Number';
          else if (fKey === 'routing_number_encrypted') fLabel = 'IFSC / Routing Code';
          else if (fKey === 'account_name') fLabel = 'Account Name';
          else fLabel = formatLabel(fKey);

          if (fVal !== null && fVal !== undefined && fVal !== '') fields.push({ label: fLabel, value: String(fVal) });
        });
      } else if (typeof value !== 'object' && typeof value !== 'function') {
        if (value !== null && value !== undefined && value !== '') {
          fields.push({ label: formatLabel(key), value: String(value) });
        }
      }
    });

    return (
      <div className="mt-6">
        <h4 className="font-display font-semibold text-brand-900 mb-4 text-base border-b border-surface-200 pb-2">Information Fields</h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm">
          {fields.map((f, i) => (
            <div key={i}>
              <dt className="text-brand-400 text-xs uppercase tracking-wide font-medium mb-1">{f.label}</dt>
              <dd className="font-medium text-brand-800 break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const renderDocuments = (app) => {
    const certs = app.verification_certificates || [];
    const extraDocs = [];
    const docData = app.businessDocData || app.business_doc_data;
    const docName = app.businessDoc || app.business_doc || 'Business Doc';
    if (docData) {
      extraDocs.push({ name: docName, url: docData });
    }
    if (app.logo_url) {
      const filename = app.logo_url.split('/').pop() || 'logo';
      extraDocs.push({ name: filename, url: app.logo_url });
    }

    if (certs.length === 0 && extraDocs.length === 0) {
      return (
        <div className="mt-8">
          <h4 className="font-display font-semibold text-brand-900 mb-4 text-base border-b border-surface-200 pb-2">Uploaded Documents</h4>
          <p className="text-sm text-brand-400 italic">No documents uploaded.</p>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <h4 className="font-display font-semibold text-brand-900 mb-4 text-base border-b border-surface-200 pb-2">Uploaded Documents</h4>
        <div className="flex flex-col gap-6">
          {certs.map((c) => {
            if (!c.document_url) return null;
            const filename = c.document_url.split('/').pop() || 'document';
            return (
              <div key={c.id || filename} className="flex flex-col gap-3 p-4 border border-surface-200 rounded-xl bg-surface-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-700">
                    {c.issued_by ? `${c.issued_by} Form` : 'Document'} - {filename}
                  </span>
                  <a
                    href={c.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 bg-white hover:bg-surface-100 px-3 py-1.5 rounded-lg transition-colors border border-surface-200"
                  >
                    <Eye size={14} className="text-brand-400" />
                    Open in New Tab
                  </a>
                </div>
                <div className="w-full h-96 border border-surface-200 rounded-lg overflow-hidden bg-white">
                  <iframe src={c.document_url} className="w-full h-full" title={filename} />
                </div>
              </div>
            );
          })}
          {extraDocs.map((doc, i) => (
            <div key={'extradoc-' + i} className="flex flex-col gap-3 p-4 border border-surface-200 rounded-xl bg-surface-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700">{doc.name}</span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 bg-white hover:bg-surface-100 px-3 py-1.5 rounded-lg transition-colors border border-surface-200"
                >
                  <Eye size={14} className="text-brand-400" />
                  Open in New Tab
                </a>
              </div>
              <div className="w-full h-96 border border-surface-200 rounded-lg overflow-hidden bg-white">
                <iframe src={doc.url} className="w-full h-full" title={doc.name} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const statusLabel = (s) => {
    if (s === 'verified') return 'approved';
    if (s === 'rejected') return 'rejected';
    if (s === 'pending') return 'pending';
    return s;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Vendor Applications</h1>
        <p className="text-sm text-brand-400 mt-1">Review and manage vendor registration requests.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 text-brand-600">
                <th className="text-left px-5 py-3 font-medium">Organization</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">City</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">Loading...</td></tr>
              )}
              {!loading && apps.map(app => (
                <tr key={app.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-brand-800">{app.name}</td>
                  <td className="px-5 py-3 text-brand-500">{app.email}</td>
                  <td className="px-5 py-3 text-brand-500">{app.city || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={statusLabel(app.verification_status)} /></td>
                  <td className="px-5 py-3 text-brand-400">{app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewApp(app)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View">
                        <Eye size={15} />
                      </button>
                      {app.verification_status !== 'verified' && (
                        <button onClick={() => handleActionClick(app, 'approved')} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {app.verification_status !== 'rejected' && (
                        <button onClick={() => handleActionClick(app, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                          <XCircle size={15} />
                        </button>
                      )}
                      <button onClick={() => handleActionClick(app, 'resubmit')} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500" title="Request Resubmit">
                        <RotateCcw size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && apps.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">No vendor applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewApp} onClose={() => setViewApp(null)} title="Vendor Application Details" size="xl">
        {viewApp && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between bg-surface-50 rounded-xl px-5 py-3">
              <div><p className="text-xs text-brand-400 font-medium">ID</p><p className="font-mono text-brand-700">{viewApp.id}</p></div>
              <div className="text-right"><p className="text-xs text-brand-400 font-medium">Status</p><StatusBadge status={statusLabel(viewApp.verification_status)} /></div>
            </div>
            {renderInfoFields(viewApp)}
            {renderDocuments(viewApp)}
          </div>
        )}
      </Modal>

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={
        confirmAction?.status === 'approved' ? 'Confirm Approval' :
          confirmAction?.status === 'rejected' ? 'Confirm Rejection' : 'Request Resubmission'
      } size="md">
        {confirmAction && (
          <div className="space-y-5">
            {confirmAction.status === 'approved' && (
              <p className="text-brand-700">
                Are you sure you want to approve {confirmAction.app.name}?
                An approval email will be sent to {confirmAction.app.email} automatically.
              </p>
            )}
            {confirmAction.status === 'rejected' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-700">Enter reason for rejection *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-surface-200 rounded-lg text-sm"
                  value={actionPayload.reason}
                  onChange={e => setActionPayload({ ...actionPayload, reason: e.target.value })}
                  placeholder="e.g. Invalid documents provided"
                />
              </div>
            )}
            {confirmAction.status === 'resubmit' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-700">Enter the specific changes required *</label>
                  <textarea
                    className="w-full px-4 py-2 border border-surface-200 rounded-lg text-sm"
                    rows={4}
                    value={actionPayload.changes}
                    onChange={e => setActionPayload({ ...actionPayload, changes: e.target.value })}
                    placeholder="Enter each change on a new line"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-700">Set resubmission deadline (optional)</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-surface-200 rounded-lg text-sm"
                    value={actionPayload.deadline}
                    onChange={e => setActionPayload({ ...actionPayload, deadline: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-brand-600 bg-surface-100 rounded-lg hover:bg-surface-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={
                  (confirmAction.status === 'rejected' && !actionPayload.reason.trim()) ||
                  (confirmAction.status === 'resubmit' && !actionPayload.changes.trim())
                }
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${confirmAction.status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                  confirmAction.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-orange-600 hover:bg-orange-700'
                  }`}
              >
                {confirmAction.status === 'approved' ? 'Confirm Approve' :
                  confirmAction.status === 'rejected' ? 'Confirm Reject' : 'Send Resubmit Request'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VendorApplications;
