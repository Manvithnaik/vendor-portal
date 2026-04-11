import React, { useState, useEffect } from 'react';
import { getApplications, updateApplicationStatus } from '../../utils/storage';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { CheckCircle, XCircle, RotateCcw, Eye } from 'lucide-react';

const ManufacturerApplications = () => {
  const [apps, setApps] = useState([]);
  const [toast, setToast] = useState(null);
  const [viewApp, setViewApp] = useState(null);

  const load = () => setApps(getApplications('manufacturer'));
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
        <h1 className="font-display font-bold text-2xl text-brand-900">Manufacturer Applications</h1>
        <p className="text-sm text-brand-400 mt-1">Review and manage manufacturer registration requests.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-100 text-brand-600">
                <th className="text-left px-5 py-3 font-medium">Organization</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">GST / Tax</th>
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
                  <td className="px-5 py-3 text-brand-500">{app.gstNumber || '—'}</td>
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
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">No manufacturer applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View detail modal */}
      <Modal open={!!viewApp} onClose={() => setViewApp(null)} title="Application Details">
        {viewApp && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Organization', viewApp.orgName],
              ['Email', viewApp.email],
              ['Phone', viewApp.phone],
              ['Industry', viewApp.industryType],
              ['GST / Tax Number', viewApp.gstNumber],
              ['Business License', viewApp.businessLicense],
              ['Annual Turnover', viewApp.annualTurnover],
              ['Contact', viewApp.contactName],
              ['Contact Email', viewApp.contactEmail],
              ['City', viewApp.city],
              ['Country', viewApp.country],
              ['Factory Address', viewApp.factoryAddress],
              ['Signatory', viewApp.signatoryName],
              ['Status', viewApp.status],
            ].map(([label, val]) => (
              <div key={label}>
                <dt className="text-brand-400">{label}</dt>
                <dd className="font-medium text-brand-800">{val || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
};

export default ManufacturerApplications;
