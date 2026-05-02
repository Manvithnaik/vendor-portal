import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import Toast from "../../components/common/Toast";

const ForgotPasswordPage = () => {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setToast({ message: data.message || "Reset link sent!", type: "success" });
      } else {
        setToast({ message: data.message || "An error occurred.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 relative p-4">
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-brand-800 to-brand-900" />
      <div className="absolute top-0 left-0 w-full h-72 opacity-10">
        <div className="absolute top-10 right-20 w-64 h-64 bg-accent-400 rounded-full blur-3xl" />
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-200 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>

        <div className="card p-8 shadow-elevated">
          {sent ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-brand-900 mb-1">Check Your Email</h1>
                <p className="text-sm text-brand-500">
                  If <span className="font-medium text-brand-800">{email}</span> is registered, you'll receive a password reset link shortly.
                </p>
              </div>
              <Link to="/login" className="btn-secondary mt-2">Back to Login</Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Mail size={20} className="text-brand-600" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl text-brand-900">Forgot Password</h1>
                  <p className="text-xs text-brand-400">We'll send a reset link to your email</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;