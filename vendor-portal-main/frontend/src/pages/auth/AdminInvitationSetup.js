import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import Toast from '../../components/common/Toast';
import { ShieldCheck, Lock, CheckCircle, AlertCircle, Loader2, User, Eye, EyeOff } from 'lucide-react';

const AdminInvitationSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setToast({ message: "Invalid or missing invitation token.", type: 'error' });
        setVerifying(false);
        return;
      }
      try {
        const res = await authService.verifyAdminInvite(token);
        setAdminInfo(res.data);
      } catch (err) {
        setToast({ message: err.response?.data?.message || "Invitation link is invalid or expired.", type: 'error' });
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const validatePassword = (pass) => {
    if (pass.length < 12) return "Password must be at least 12 characters long.";
    if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pass)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*]/.test(pass)) return "Password must contain at least one special character (!@#$%^&*).";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validatePassword(formData.new_password);
    if (error) {
      setToast({ message: error, type: 'error' });
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setToast({ message: "Passwords do not match.", type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await authService.setupAdminPassword(token, formData.new_password, formData.confirm_password);
      setToast({ message: "Account setup complete! Redirecting to login...", type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Failed to set password.", type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-brand-800" size={40} />
          <p className="text-brand-400 font-medium tracking-wide">Verifying Invitation...</p>
        </div>
      </div>
    );
  }

  if (!adminInfo && !verifying) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="card shadow-elevated p-10 max-w-sm text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-display font-bold text-brand-900">Invalid Link</h2>
          <p className="text-brand-400">This invitation link is invalid, expired, or has already been used.</p>
          <button onClick={() => navigate('/login')} className="btn-secondary w-full">Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-brand-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-900 tracking-tight">Complete Setup</h1>
          <p className="mt-2 text-brand-400">Choose a password for your new administrator account.</p>
        </div>

        <div className="card shadow-elevated p-8">
          <div className="mb-8 p-4 bg-brand-50/30 border border-brand-100/50 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-700 shadow-sm">
              <User size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-300 uppercase tracking-widest">Invited As</p>
              <p className="font-semibold text-brand-900">{adminInfo.name}</p>
              <p className="text-xs text-brand-400">{adminInfo.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-700 ml-1">Choose Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-300 group-focus-within:text-brand-800 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="At least 12 chars, upper, digit, symbol"
                  className="input-field pl-11 pr-11"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-300 hover:text-brand-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-700 ml-1">Confirm Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-300 group-focus-within:text-brand-800 transition-colors">
                  <CheckCircle size={18} />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Repeat your password"
                  className="input-field pl-11 pr-11"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-300 hover:text-brand-600 transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-brand-50/50 rounded-xl p-4 border border-brand-100/50">
              <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <AlertCircle size={12} />
                Requirements
              </p>
              <ul className="text-[11px] text-brand-500 space-y-1 ml-1">
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${formData.new_password.length >= 12 ? 'bg-green-500' : 'bg-brand-300'}`} />
                  Minimum 12 characters
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(formData.new_password) ? 'bg-green-500' : 'bg-brand-300'}`} />
                  At least one uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(formData.new_password) ? 'bg-green-500' : 'bg-brand-300'}`} />
                  At least one number
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*]/.test(formData.new_password) ? 'bg-green-500' : 'bg-brand-300'}`} />
                  At least one special character (!@#$%^&*)
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-800/20 active:scale-[0.98] transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Saving Password...
                </>
              ) : (
                <>
                  Set Password & Activate
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminInvitationSetup;
