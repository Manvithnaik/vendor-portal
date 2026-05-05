import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import { ArrowLeft, Eye, EyeOff, X, Store, Factory, ArrowRight } from 'lucide-react';

/* ─────────────────────────────────────────────
   Registration-type selection modal
───────────────────────────────────────────── */
const RegistrationModal = ({ onClose, onSelect }) => (
  /* Backdrop */
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
    onClick={onClose}
  >
    {/* Panel – stop clicks from bubbling to backdrop */}
    <div
      className="relative w-full max-w-md bg-white rounded-2xl shadow-elevated animate-fade-in overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-surface-200 flex items-start justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-brand-900">Create an Account</h2>
          <p className="text-sm text-brand-400 mt-0.5">Choose the account type that best fits your role</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-brand-400 hover:bg-surface-100 hover:text-brand-700 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Options */}
      <div className="p-6 space-y-4">
        {/* Vendor card */}
        <button
          onClick={() => onSelect('vendor')}
          className="w-full text-left group flex items-center gap-4 p-4 rounded-xl border-2 border-surface-200
                     hover:border-brand-400 hover:bg-brand-50 transition-all duration-200 focus:outline-none
                     focus:ring-2 focus:ring-brand-300"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center shrink-0
                          group-hover:bg-brand-200 transition-colors">
            <Store size={22} className="text-brand-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-brand-900">Vendor Registration</p>
            <p className="text-xs text-brand-400 mt-0.5">List products, manage orders &amp; shipments</p>
          </div>
          <ArrowRight size={16} className="text-brand-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Manufacturer card */}
        <button
          onClick={() => onSelect('manufacturer')}
          className="w-full text-left group flex items-center gap-4 p-4 rounded-xl border-2 border-surface-200
                     hover:border-accent-400 hover:bg-accent-50 transition-all duration-200 focus:outline-none
                     focus:ring-2 focus:ring-accent-300"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center shrink-0
                          group-hover:bg-accent-200 transition-colors">
            <Factory size={22} className="text-accent-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-brand-900">Manufacturer Registration</p>
            <p className="text-xs text-brand-400 mt-0.5">Browse products, place purchase orders</p>
          </div>
          <ArrowRight size={16} className="text-brand-300 group-hover:text-accent-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* Footer hint */}
      <div className="px-6 pb-5 text-center">
        <p className="text-xs text-brand-300">
          Already have an account?{' '}
          <button onClick={onClose} className="text-brand-500 hover:text-brand-700 font-medium underline transition-colors">
            Sign in instead
          </button>
        </p>
      </div>
    </div>
  </div>
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegSelect = (role) => {
    setShowRegModal(false);
    navigate(`/register/${role}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setToast({ message: result.message, type: 'error' });
      return;
    }
    if (result.user?.must_change_password) {
      navigate('/admin/set-password');
      return;
    }

    const userRole = result.user?.role || 'vendor';
    navigate(`/${userRole}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 relative p-4">
      {/* Registration type selection modal */}
      {showRegModal && (
        <RegistrationModal
          onClose={() => setShowRegModal(false)}
          onSelect={handleRegSelect}
        />
      )}
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-brand-800 to-brand-900" />
      <div className="absolute top-0 left-0 w-full h-72 opacity-10">
        <div className="absolute top-10 right-20 w-64 h-64 bg-accent-400 rounded-full blur-3xl" />
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

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

          <h1 className="font-display font-bold text-2xl text-brand-900 mb-1">Welcome back</h1>
          <p className="text-sm text-brand-400 mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>


            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <Link to="/forgot-password" size="sm" variant="link" className="text-brand-500 hover:text-brand-700 transition-colors">
                Forgot password?
              </Link>
              <button
                type="button"
                onClick={() => setShowRegModal(true)}
                className="text-accent-600 hover:text-accent-700 font-medium transition-colors"
              >
                Create account
              </button>
            </div>
            <div className="text-center pt-2 border-t border-surface-200">
              <Link to="/track-application" className="text-brand-500 hover:text-brand-700 transition-colors">
                Check Application Status
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
