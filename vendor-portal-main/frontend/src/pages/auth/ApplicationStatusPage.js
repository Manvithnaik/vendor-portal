import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, Mail, ArrowLeft } from 'lucide-react';

const ApplicationStatusPage = () => {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const role  = params.get('role')  || 'vendor';

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success card */}
        <div className="card p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="font-display font-bold text-2xl text-brand-900 mb-2">Application Submitted!</h1>
          <p className="text-brand-500 mb-6">
            Your <span className="font-semibold capitalize">{role}</span> registration has been received
            {email && <> for <span className="font-semibold text-brand-700">{email}</span></>}.
          </p>

          {/* Status timeline */}
          <div className="space-y-4 text-left mb-8">
            {[
              { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Application Submitted', desc: 'Your details have been recorded.' },
              { icon: Clock,        color: 'text-orange-500', bg: 'bg-orange-100', label: 'Under Review', desc: 'Our team is reviewing your application (1–2 business days).' },
              { icon: Mail,         color: 'text-brand-400',  bg: 'bg-brand-100',  label: 'Approval Email', desc: 'You will receive an email once approved.' },
            ].map(({ icon: Icon, color, bg, label, desc }, i) => (
              <div key={i} className="flex gap-4">
                <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={color} />
                </div>
                <div>
                  <p className="font-semibold text-brand-800 text-sm">{label}</p>
                  <p className="text-xs text-brand-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link to={`/login/${role}`} className="btn-primary w-full justify-center">
              Go to Login
            </Link>
            <Link to="/" className="btn-secondary w-full justify-center">
              <ArrowLeft size={15} /> Back to Home
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-brand-400 mt-4">
          Questions? Contact <a href="mailto:support@vendorhub.com" className="underline">support@vendorhub.com</a>
        </p>
      </div>
    </div>
  );
};

export default ApplicationStatusPage;
