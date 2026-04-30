import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Toast from "../../components/common/Toast";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

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
                setToast({ message: data.message || "Reset link sent!", type: "success" });
                setEmail("");
            } else {
                setToast({ message: data.message || "An error occurred.", type: "error" });
            }
        } catch (error) {
            setToast({ message: "Network error. Please try again.", type: "error" });
        } finally {
            setLoading(false);
        }
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
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-200 hover:text-white transition-colors">
                        <ArrowLeft size={16} /> Back to login
                    </Link>
                </div>

                <div className="card p-8 shadow-elevated">
                    <h1 className="font-display font-bold text-2xl text-brand-900 mb-1">Forgot Password</h1>
                    <p className="text-sm text-brand-400 mb-6">Enter your email address to receive a password reset link.</p>

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

                        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;