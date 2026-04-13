import React, { useState, useEffect } from 'react';
import { getApplications, updateApplicationStatus } from '../../utils/storage';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { CheckCircle, XCircle, RotateCcw, Eye } from 'lucide-react';

const VendorApplications = () => {
  const [apps, setApps] = useState([]);
  const [toast, setToast] = useState(null);
  const [viewApp, setViewApp] = useState(null);

  const load = () => setApps(getApplications('vendor'));
  useEffect(() => { load(); }, []);

  const handleAction = (id, status) => {
    updateApplicationStatus(id, status);
    setToast({ message: `Application ${status}.`, type: 'success' });
    load();
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
                <th className="text-left px-5 py-3 font-medium">Industry</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {apps.map(app => (
                <tr key={app.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-brand-800">{app.orgName}</td>
                  <td className="px-5 py-3 text-brand-500">{app.email}</td>
                  <td className="px-5 py-3 text-brand-500">{app.industryType || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-5 py-3 text-brand-400">{new Date(app.submittedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewApp(app)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View">
                        <Eye size={15} />
                      </button>
                      {app.status !== 'approved' && (
                        <button onClick={() => handleAction(app.id, 'approved')} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {app.status !== 'rejected' && (
                        <button onClick={() => handleAction(app.id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                          <XCircle size={15} />
                        </button>
                      )}
                      {app.status !== 'resubmit' && (
                        <button onClick={() => handleAction(app.id, 'resubmit')} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500" title="Ask Resubmit">
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {apps.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">No vendor applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View detail modal */}
      <Modal open={!!viewApp} onClose={() => setViewApp(null)} title="Vendor Application Details" size="xl">
        {viewApp && (
          <div className="space-y-6">
            {/* Status banner */}
            <div className="flex items-center justify-between bg-surface-50 rounded-xl px-5 py-3">
              <div>
                <p className="text-xs text-brand-400 uppercase tracking-wide font-medium">Application ID</p>
                <p className="font-mono text-sm text-brand-700">{viewApp.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-brand-400 uppercase tracking-wide font-medium">Status</p>
                <StatusBadge status={viewApp.status} />
              </div>
              <div className="text-right">
                <p className="text-xs text-brand-400 uppercase tracking-wide font-medium">Submitted</p>
                <p className="text-sm font-medium text-brand-700">{new Date(viewApp.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Organization Details */}
            <div>
              <h4 className="font-display font-semibold text-brand-900 mb-3 text-base border-b border-surface-200 pb-2">Organization Details</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Organization Name', viewApp.orgName],
                  ['Email', viewApp.email],
                  ['Phone', viewApp.phone],
                  ['Industry Type', viewApp.industryType],
                  ['Factory Address', viewApp.factoryAddress],
                ].map(([label, val]) => (
                  <div key={label}>
                    <dt className="text-brand-400 text-xs uppercase tracking-wide font-medium mb-0.5">{label}</dt>
                    <dd className="font-medium text-brand-800">{val || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Address */}
            <div>
              <h4 className="font-display font-semibold text-brand-900 mb-3 text-base border-b border-surface-200 pb-2">Address</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Address Line', viewApp.addressLine1],
                  ['City', viewApp.city],
                  ['State', viewApp.state],
                  ['Country', viewApp.country],
                  ['Postal Code', viewApp.postalCode],
                ].map(([label, val]) => (
                  <div key={label}>
                    <dt className="text-brand-400 text-xs uppercase tracking-wide font-medium mb-0.5">{label}</dt>
                    <dd className="font-medium text-brand-800">{val || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Contact Person */}
            <div>
              <h4 className="font-display font-semibold text-brand-900 mb-3 text-base border-b border-surface-200 pb-2">Contact Person</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Contact Name', viewApp.contactName],
                  ['Contact Email', viewApp.contactEmail],
                  ['Contact Phone', viewApp.contactPhone],
                ].map(([label, val]) => (
                  <div key={label}>
                    <dt className="text-brand-400 text-xs uppercase tracking-wide font-medium mb-0.5">{label}</dt>
                    <dd className="font-medium text-brand-800">{val || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Authorized Signatory */}
            <div>
              <h4 className="font-display font-semibold text-brand-900 mb-3 text-base border-b border-surface-200 pb-2">Authorized Signatory</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Signatory Name', viewApp.signatoryName],
                  ['Signatory Phone', viewApp.signatoryPhone],
                ].map(([label, val]) => (
                  <div key={label}>
                    <dt className="text-brand-400 text-xs uppercase tracking-wide font-medium mb-0.5">{label}</dt>
                    <dd className="font-medium text-brand-800">{val || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Documents */}
            <div>
              <h4 className="font-display font-semibold text-brand-900 mb-3 text-base border-b border-surface-200 pb-2">Uploaded Documents</h4>
              {viewApp.businessDoc ? (
                viewApp.businessDocData ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-brand-600">
                      <Eye size={14} /> <span className="font-medium">{viewApp.businessDoc}</span>
                    </div>
                    <iframe
                      src={viewApp.businessDocData}
                      title="Document Preview"
                      className="w-full h-80 border border-surface-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const win = window.open();
                        if (win) win.document.write(`<iframe src="${viewApp.businessDocData}" style="width:100%;height:100vh;border:none;"></iframe>`);
                      }}
                      className="btn-secondary text-xs"
                    >
                      Open in New Tab
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-brand-500">{viewApp.businessDoc} (file data not available for preview)</p>
                )
              ) : (
                <p className="text-sm text-brand-400 italic">No documents uploaded.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VendorApplications;
