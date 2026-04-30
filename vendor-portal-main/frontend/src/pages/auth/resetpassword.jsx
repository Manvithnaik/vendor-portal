import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import Toast from "../../components/common/Toast";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirm]   = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError]     = useState("");
  const [toast, setToast]               = useState(null);
  const [success, setSuccess]           = useState(false);

  useEffect(() => {
    if (!token) { setTokenError("No reset token provided."); setIsValidating(false); return; }
    (async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/auth/reset-password/validate?token=${token}`);
        if (!res.ok) setTokenError("Invalid or expired reset token.");
      } catch { setTokenError("Network error validating token."); }
      finally   { setIsValidating(false); }
    })();
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({ message: "Passwords do not match.", type: "error" });
      return;
    }
    if (password.length < 8) {
      setToast({ message: "Password must be at least 8 characters.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setToast({ message: data.message || "Password changed successfully!", type: "success" });
        setTimeout(() => navigate("/login"), 2500);
      } else {
        setToast({ message: data.message || "An error occurred.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword ? password === confirmPassword : true;

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
          <h1 className="font-display font-bold text-2xl text-brand-900 mb-1">Set New Password</h1>

          {isValidating ? (
            <p className="text-sm text-brand-600 my-6">Validating reset link...</p>
          ) : tokenError ? (
            <div className="my-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{tokenError}</div>
          ) : success ? (
            <div className="my-6 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <p className="font-semibold text-brand-900">Password Updated!</p>
              <p className="text-sm text-brand-500">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-brand-400 mb-6">Enter and confirm your new password below.</p>
              <form onSubmit={handleReset} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirm(e.target.value)}
                      className={`input-field pr-10 ${!passwordsMatch ? 'border-red-400 focus:ring-red-300' : ''}`}
                      placeholder="Re-enter password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {!passwordsMatch && (
                    <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-3 mt-2"
                  disabled={loading || !passwordsMatch}
                >
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;