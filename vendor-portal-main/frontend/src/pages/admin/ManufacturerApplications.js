import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { CheckCircle, XCircle, RotateCcw, Eye } from 'lucide-react';

const ManufacturerApplications = () => {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [viewApp, setViewApp] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/organizations/pending-applications');
      const all = res?.data || [];
      setApps(all.filter(o => o.org_type === 'customer'));
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActionClick = (orgId, status) => {
    setConfirmAction({ orgId, status });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { orgId, status } = confirmAction;
    const backendStatus = status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';
    try {
      await apiClient.patch(`/organizations/${orgId}/verification?status=${backendStatus}`);
      setToast({ message: `Application ${status}.`, type: 'success' });
      setConfirmAction(null);
      load();
    } catch (err) {
      setToast({ message: err.message || 'Action failed', type: 'error' });
      setConfirmAction(null);
    }
  };

  const renderAllFields = (app) => {
    const skipKeys = ['id', 'org_type', 'logo_url', 'verification_status', 'is_active', 'created_at', 'updated_at', 'verification_certificates', 'financial_details'];
    const entries = Object.entries(app).filter(([k, v]) => !skipKeys.includes(k) && v !== null && v !== '');
    
    return entries.map(([key, val]) => {
      const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return (
        <div key={key} className="grid grid-cols-3 gap-2">
          <span className="text-brand-400 font-medium">{label}</span>
          <span className="col-span-2 text-brand-800">{val}</span>
        </div>
      );
    });
  };

  const renderDocuments = (app) => {
    const certs = app.verification_certificates || [];
    if (certs.length === 0) return null;
    return (
      <div className="mt-4 border-t border-surface-200 pt-4">
        <h3 className="font-medium text-brand-900 mb-3">Uploaded Documents</h3>
        <div className="space-y-2">
          {certs.map((c) => (
            c.document_url && (
              <div key={c.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-brand-800">{c.issued_by}</p>
                  <p className="text-xs text-brand-500">Number: {c.certificate_number}</p>
                </div>
                <a 
                  href={c.document_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-brand-600 hover:underline text-sm font-medium"
                >
                  View Document
                </a>
              </div>
            )
          ))}
        </div>
      </div>
    );
  };

  const statusLabel = (s) => s === 'verified' ? 'approved' : s;

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
                <th className="text-left px-5 py-3 font-medium">City</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading && <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">Loading...</td></tr>}
              {!loading && apps.map(app => (
                <tr key={app.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-brand-800">{app.name}</td>
                  <td className="px-5 py-3 text-brand-500">{app.email}</td>
                  <td className="px-5 py-3 text-brand-500">{app.city || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={statusLabel(app.verification_status)} /></td>
                  <td className="px-5 py-3 text-brand-400">{app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewApp(app)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700" title="View"><Eye size={15} /></button>
                      {app.verification_status !== 'verified' && (
                        <button onClick={() => handleActionClick(app.id, 'approved')} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve"><CheckCircle size={15} /></button>
                      )}
                      {app.verification_status !== 'rejected' && (
                        <button onClick={() => handleActionClick(app.id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject"><XCircle size={15} /></button>
                      )}
                      {app.verification_status !== 'pending' && (
                        <button onClick={() => handleActionClick(app.id, 'pending')} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500" title="Reset"><RotateCcw size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && apps.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-400">No manufacturer applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewApp} onClose={() => setViewApp(null)} title="Manufacturer Application Details" size="xl">
        {viewApp && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between bg-surface-50 rounded-xl px-5 py-3">
              <div><p className="text-xs text-brand-400 font-medium">ID</p><p className="font-mono text-brand-700">{viewApp.id}</p></div>
              <div className="text-right"><p className="text-xs text-brand-400 font-medium">Status</p><StatusBadge status={statusLabel(viewApp.verification_status)} /></div>
            </div>
            {renderAllFields(viewApp)}
            {renderDocuments(viewApp)}
          </div>
        )}
      </Modal>

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm Action" size="md">
        {confirmAction && (
          <div className="space-y-5">
            <p className="text-brand-700">
              {confirmAction.status === 'approved' 
                ? "Do you want to approve this application?" 
                : confirmAction.status === 'rejected'
                ? "Do you want to reject this application?"
                : "Do you want to reset this application to pending?"}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setConfirmAction(null)} 
                className="px-4 py-2 text-sm font-medium text-brand-600 bg-surface-100 rounded-lg hover:bg-surface-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAction} 
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                  confirmAction.status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                  confirmAction.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Yes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManufacturerApplications;
