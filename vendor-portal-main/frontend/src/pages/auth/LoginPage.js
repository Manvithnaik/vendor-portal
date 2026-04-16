import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('vendor');
  const [showPw, setShowPw] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password, role);
    setLoading(false);

    if (!result.success) {
      setToast({ message: result.message, type: 'error' });
      return;
    }
    navigate(`/${role}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 relative p-4">
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

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {['admin', 'vendor', 'manufacturer'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      role === r
                        ? 'bg-brand-800 text-white border-brand-800'
                        : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-50'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button className="text-brand-500 hover:text-brand-700 transition-colors">Forgot password?</button>
            <Link to={`/register/${role === 'admin' ? 'vendor' : role}`} className="text-accent-600 hover:text-accent-700 font-medium">Create account</Link>
          </div>

          {/* Quick hint */}
          <div className="mt-6 p-3 bg-surface-100 rounded-lg">
            <p className="text-xs text-brand-400">
              <strong>Demo admin:</strong> admin@vendorhub.com / admin123 (role: Admin)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
