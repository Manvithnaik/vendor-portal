import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getApplicationByEmail, resubmitApplication } from '../../utils/storage';
import StatusTimeline from '../../components/common/StatusTimeline';
import Toast from '../../components/common/Toast';
import { ArrowLeft, RefreshCcw, ExternalLink } from 'lucide-react';

const ApplicationStatusPage = () => {
  const [params] = useSearchParams();
  const email = params.get('email');
  const role = params.get('role');
  const [app, setApp] = useState(null);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const loadApp = () => {
    if (email && role) {
      const found = getApplicationByEmail(email, role);
      setApp(found || null);
      if (found) setEditForm(found);
    }
  };

  useEffect(() => { loadApp(); }, [email, role]);

  const handleResubmit = (e) => {
    e.preventDefault();
    resubmitApplication(app.id, editForm);
    setEditing(false);
    setToast({ message: 'Application resubmitted successfully!', type: 'success' });
    loadApp();
  };

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="card p-8 text-center max-w-md">
          <h2 className="font-display font-bold text-xl text-brand-900 mb-2">Application Not Found</h2>
          <p className="text-sm text-brand-400 mb-4">No application found for this email and role.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="bg-white border-b border-surface-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg text-brand-900">Application Status</h1>
            <p className="text-sm text-brand-400">{email} — {role}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Timeline */}
        <div className="card p-8">
          <h2 className="font-display font-semibold text-brand-900 mb-6 text-center">Tracking Progress</h2>
          <StatusTimeline status={app.status} />
          <div className="mt-6 text-center">
            <button onClick={loadApp} className="btn-ghost text-xs">
              <RefreshCcw size={14} /> Refresh Status
            </button>
          </div>
        </div>

        {/* Status message */}
        <div className="card p-6">
          {app.status === 'pending' && (
            <p className="text-sm text-brand-600">Your application is under review. This typically takes 1–2 business days.</p>
          )}
          {app.status === 'approved' && (
            <div className="text-center">
              <p className="text-sm text-accent-700 font-medium mb-3">Your application has been approved! You can now log in.</p>
              <Link to="/login" className="btn-accent">
                <ExternalLink size={14} /> Go to Login
              </Link>
            </div>
          )}
          {app.status === 'rejected' && (
            <p className="text-sm text-danger-600">Your application has been rejected. Please contact support for more information.</p>
          )}
          {app.status === 'resubmit' && !editing && (
            <div className="text-center">
              <p className="text-sm text-orange-700 mb-3">Your application needs revisions. Please update and resubmit.</p>
              <button onClick={() => setEditing(true)} className="btn-primary">Edit & Resubmit</button>
            </div>
          )}
        </div>

        {/* Resubmit form */}
        {editing && app.status === 'resubmit' && (
          <div className="card p-6">
            <h2 className="font-display font-semibold text-brand-900 mb-4">Update Application</h2>
            <form onSubmit={handleResubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['orgName', 'phone', 'contactName', 'contactEmail', 'industryType', 'factoryAddress'].map(field => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-brand-700 mb-1 capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      className="input-field"
                      value={editForm[field] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-accent">Resubmit</button>
              </div>
            </form>
          </div>
        )}

        {/* Application details */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-brand-900 mb-4">Application Details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Organization', app.orgName],
              ['Email', app.email],
              ['Phone', app.phone],
              ['Industry', app.industryType],
              ['City', app.city],
              ['State', app.state],
              ['Country', app.country],
              ['Submitted', new Date(app.submittedAt).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-brand-400">{label}</dt>
                <dd className="font-medium text-brand-800">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatusPage;
