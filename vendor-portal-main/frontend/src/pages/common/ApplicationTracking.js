import React, { useState, useEffect } from 'react';
import { vendorService } from '../../services/vendorService';
import { CheckCircle, Clock, FileText, MapPin, Globe, Phone, Mail } from 'lucide-react';

const ApplicationTracking = () => {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await vendorService.getApplicationStatus();
        setApplication(response.data);
      } catch (err) {
        setError('Failed to fetch application status.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-800"></div>
    </div>
  );

  if (error) return (
    <div className="p-6 text-center text-danger-600 bg-danger-50 rounded-xl border border-danger-100">
      {error}
    </div>
  );

  const statusColors = {
    pending: 'bg-orange-100 text-orange-700 border-orange-200',
    verified: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-900">Application Tracking</h1>
          <p className="text-brand-500 mt-1">View your organization's registration details and status.</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full border text-sm font-semibold capitalize ${statusColors[application?.verification_status] || 'bg-brand-50'}`}>
          {application?.verification_status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-brand-800 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-brand-500" />
              Organization Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <label className="text-xs font-medium text-brand-400 uppercase tracking-wider">Company Name</label>
                <p className="text-brand-900 font-medium">{application?.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-brand-400 uppercase tracking-wider">Org Type</label>
                <p className="text-brand-900 font-medium capitalize">{application?.org_type}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-brand-400 uppercase tracking-wider">Email</label>
                <div className="flex items-center gap-2 text-brand-700 mt-0.5">
                  <Mail size={14} className="text-brand-400" />
                  <span>{application?.email}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-brand-400 uppercase tracking-wider">Phone</label>
                <div className="flex items-center gap-2 text-brand-700 mt-0.5">
                  <Phone size={14} className="text-brand-400" />
                  <span>{application?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-surface-100">
              <h3 className="text-sm font-bold text-brand-800 mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-brand-500" />
                Address
              </h3>
              <p className="text-brand-600 text-sm">
                {application?.address_line1}<br />
                {application?.city}, {application?.state} {application?.postal_code}<br />
                {application?.country}
              </p>
              {application?.website && (
                <div className="mt-4 flex items-center gap-2 text-sm text-brand-700">
                  <Globe size={16} className="text-brand-400" />
                  <a href={application?.website} target="_blank" rel="noreferrer" className="text-brand-800 underline hover:text-brand-900">
                    {application?.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-brand-800 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-brand-500" />
              Verification Documents
            </h2>
            <div className="p-4 bg-brand-50 rounded-lg border border-brand-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-brand-800 shadow-sm border border-brand-100">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-900">Business Document</p>
                  <p className="text-xs text-brand-500">ID: {application?.business_doc_data || 'Attached'}</p>
                </div>
              </div>
              {application?.business_doc && (
                <a href={application.business_doc} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-800 hover:underline">
                  VIEW DOC
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-brand-800 mb-6 flex items-center gap-2">
              <Clock size={20} className="text-brand-500" />
              Timeline
            </h2>
            <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-100">
              <div className="relative pl-10">
                <div className="absolute left-0 top-0 w-9 h-9 rounded-full bg-green-100 border-4 border-white flex items-center justify-center z-10 shadow-sm">
                  <CheckCircle size={16} className="text-green-600" />
                </div>
                <p className="font-bold text-brand-900 text-sm">Application Submitted</p>
                <p className="text-xs text-brand-500 mt-0.5">{new Date(application?.created_at).toLocaleDateString()}</p>
              </div>

              <div className="relative pl-10">
                <div className={`absolute left-0 top-0 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm ${application?.verification_status !== 'pending' ? 'bg-green-100' : 'bg-orange-100'}`}>
                   {application?.verification_status !== 'pending' ? <CheckCircle size={16} className="text-green-600" /> : <Clock size={16} className="text-orange-500" />}
                </div>
                <p className="font-bold text-brand-900 text-sm">Admin Review</p>
                <p className="text-xs text-brand-500 mt-0.5">
                  {application?.verification_status === 'pending' ? 'Currently under review' : 'Review completed'}
                </p>
              </div>

              <div className="relative pl-10">
                <div className={`absolute left-0 top-0 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm ${application?.verification_status === 'verified' ? 'bg-green-100' : 'bg-brand-50'}`}>
                   {application?.verification_status === 'verified' ? <CheckCircle size={16} className="text-green-600" /> : <div className="w-2 h-2 bg-brand-300 rounded-full" />}
                </div>
                <p className="font-bold text-brand-900 text-sm">Account Activation</p>
                <p className="text-xs text-brand-500 mt-0.5">
                   {application?.verification_status === 'verified' ? 'System ready for use' : 'Awaiting approval'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationTracking;
