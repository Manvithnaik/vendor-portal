import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import { ShieldCheck, Lock, CheckCircle, AlertCircle, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';

const AdminSetPassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

    if (formData.new_password !== formData.confirm_new_password) {
      setToast({ message: "Passwords do not match.", type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.changeAdminPassword(
        formData.current_password, 
        formData.new_password, 
        formData.confirm_new_password
      );
      if (result.status === 'success') {
        setToast({ message: "Password updated successfully! Redirecting...", type: 'success' });
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      } else {
        setToast({ message: result.message || "Failed to update password.", type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || err.message || "An error occurred.", type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-brand-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-900 tracking-tight">Security Setup</h1>
          <p className="mt-2 text-brand-400">Please update your password to continue.</p>
        </div>

        <div className="card shadow-elevated p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-700 ml-1">Current Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-300 group-focus-within:text-brand-800 transition-colors">
                  <KeyRound size={18} />
                </div>
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  placeholder="Enter temporary password"
                  className="input-field pl-11 pr-11"
                  value={formData.current_password}
                  onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-300 hover:text-brand-600 transition-colors"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-700 ml-1">New Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-300 group-focus-within:text-brand-800 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  required
                  placeholder="At least 12 chars, upper, digit, symbol"
                  className="input-field pl-11 pr-11"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-300 hover:text-brand-600 transition-colors"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-700 ml-1">Confirm New Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-300 group-focus-within:text-brand-800 transition-colors">
                  <CheckCircle size={18} />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Repeat new password"
                  className="input-field pl-11 pr-11"
                  value={formData.confirm_new_password}
                  onChange={(e) => setFormData({ ...formData, confirm_new_password: e.target.value })}
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
                  <div className={`w-1 h-1 rounded-full ${formData.new_password.length >= 12 ? 'bg-green-500' : 'bg-brand-300'}`} />
                  Minimum 12 characters
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${/[A-Z]/.test(formData.new_password) ? 'bg-green-500' : 'bg-brand-300'}`} />
                  At least one uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${/[0-9]/.test(formData.new_password) ? 'bg-green-500' : 'bg-brand-300'}`} />
                  At least one number
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${/[!@#$%^&*]/.test(formData.new_password) ? 'bg-green-500' : 'bg-brand-300'}`} />
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
                  Updating...
                </>
              ) : (
                <>
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs text-brand-300">
          Logged in as <span className="font-semibold text-brand-400">{user?.email}</span>
        </p>
      </div>
    </div>
  );
};

export default AdminSetPassword;
