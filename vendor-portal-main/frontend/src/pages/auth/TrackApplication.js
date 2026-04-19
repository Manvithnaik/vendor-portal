import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TrackApplication = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      navigate(`/application-status?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4 relative">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-brand-800 to-brand-900" />
      <div className="absolute top-0 left-0 w-full h-72 opacity-10">
        <div className="absolute top-10 right-20 w-64 h-64 bg-accent-400 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-brand-200 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>

        <div className="card p-8 shadow-elevated">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">V</span>
            </div>
            <span className="font-display font-bold text-xl text-brand-900">VendorHub</span>
          </div>

          <h1 className="font-display font-bold text-2xl text-brand-900 mb-2">Track Application</h1>
          <p className="text-sm text-brand-500 mb-6">
            Enter your registered email address to check the status of your application.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full py-3">
              Check Status
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-brand-500">Remember your details? </span>
            <Link to="/login" className="text-accent-600 hover:text-accent-700 font-medium">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackApplication;
