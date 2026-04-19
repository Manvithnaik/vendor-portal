import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Mail, ArrowLeft, XCircle, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';

const ApplicationStatusPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') || '';
  const initialRole = params.get('role') || 'vendor';

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await authService.getApplicationStatus(email);
        if (res.status === 'success' && res.data) {
          setStatusData(res.data);
        } else {
          setError(res.message || 'Failed to check status');
        }
      } catch (err) {
        setError('Error checking application status');
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-brand-600" size={32} />
          <p className="text-brand-600 font-medium">Checking application status...</p>
        </div>
      </div>
    );
  }

  // Determine what to show
  const role = statusData?.role || initialRole;
  const status = statusData?.status || 'unknown';

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4 relative">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-brand-800 to-brand-900" />
      <div className="absolute top-0 left-0 w-full h-72 opacity-10">
        <div className="absolute top-10 right-20 w-64 h-64 bg-accent-400 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative">
        <div className="card p-8 text-center animate-fade-in shadow-elevated">
          {!email ? (
            <>
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-5">
                <Clock size={32} className="text-orange-500" />
              </div>
              <h1 className="font-display font-bold text-2xl text-brand-900 mb-2">Email Required</h1>
              <p className="text-brand-500 mb-6">
                Please provide an email to check your application status.
              </p>
              <Link to="/track-application" className="btn-primary w-full justify-center">
                Track Application
              </Link>
            </>
          ) : status === 'not_found' || error ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <XCircle size={32} className="text-red-600" />
              </div>
              <h1 className="font-display font-bold text-2xl text-brand-900 mb-2">Not Found</h1>
              <p className="text-brand-500 mb-6">
                No application found for <span className="font-semibold text-brand-700">{email}</span>.
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/track-application" className="btn-primary w-full justify-center">
                  Try Another Email
                </Link>
                <Link to={`/register/${role}`} className="btn-secondary w-full justify-center">
                  Register Now
                </Link>
              </div>
            </>
          ) : status === 'rejected' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <XCircle size={32} className="text-red-600" />
              </div>
              <h1 className="font-display font-bold text-2xl text-brand-900 mb-2">Application Rejected</h1>
              <p className="text-brand-600 font-medium mb-2">
                Your application was rejected. Please resubmit.
              </p>
              <p className="text-brand-500 mb-6 text-sm">
                We've reviewed your application for <span className="font-semibold text-brand-700">{email}</span> and unfortunately it was rejected. You can update your details and resubmit.
              </p>
              <div className="flex flex-col gap-3">
                <Link to={`/register/${role}?email=${encodeURIComponent(email)}&resubmit=true`} className="btn-primary w-full justify-center bg-red-600 hover:bg-red-700 border-red-600">
                  Resubmit Application
                </Link>
                <Link to="/" className="btn-secondary w-full justify-center">
                  <ArrowLeft size={15} /> Back to Home
                </Link>
              </div>
            </>
          ) : status === 'verified' || status === 'approved' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h1 className="font-display font-bold text-2xl text-brand-900 mb-2">Application Approved!</h1>
              <p className="text-brand-500 mb-6">
                Congratulations! Your application for <span className="font-semibold text-brand-700">{email}</span> has been approved. You can now log in to the portal.
              </p>
              <div className="flex flex-col gap-3">
                <Link to={`/login`} className="btn-primary w-full justify-center">
                  Go to Login
                </Link>
              </div>
            </>
          ) : (
            // Pending State
            <>
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-5">
                <Clock size={32} className="text-orange-500" />
              </div>
              <h1 className="font-display font-bold text-2xl text-brand-900 mb-2">Application Pending</h1>
              <p className="text-brand-500 mb-6">
                Your <span className="font-semibold capitalize">{role}</span> registration for <span className="font-semibold text-brand-700">{email}</span> is currently under review.
              </p>
              
              {/* Status timeline */}
              <div className="space-y-4 text-left mb-8 bg-surface-100 p-4 rounded-xl border border-brand-100">
                {[
                  { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Application Submitted', desc: 'Your details have been recorded.' },
                  { icon: Clock,        color: 'text-orange-500', bg: 'bg-orange-100', label: 'Under Review', desc: 'Our team is reviewing your application (1–2 business days).' },
                  { icon: Mail,         color: 'text-brand-400',  bg: 'bg-brand-100',  label: 'Approval Email', desc: 'You will receive an email once approved.' },
                ].map(({ icon: Icon, color, bg, label, desc }, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i !== 2 && <div className="absolute left-4 top-8 w-0.5 h-6 bg-brand-200 -ml-px"></div>}
                    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0 z-10`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-800 text-sm">{label}</p>
                      <p className="text-xs text-brand-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <Link to="/" className="btn-secondary w-full justify-center">
                  <ArrowLeft size={15} /> Back to Home
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-brand-400 mt-6 relative z-10">
          Questions? Contact <a href="mailto:support@vendorhub.com" className="underline hover:text-brand-300">support@vendorhub.com</a>
        </p>
      </div>
    </div>
  );
};

export default ApplicationStatusPage;
