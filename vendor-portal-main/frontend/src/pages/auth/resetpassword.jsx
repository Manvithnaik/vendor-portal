import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../../components/common/Toast";

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [tokenError, setTokenError] = useState("");
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!token) {
            setTokenError("No reset token provided.");
            setIsValidating(false);
            return;
        }

        const validateToken = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/v1/auth/reset-password/validate?token=${token}`);
                if (!res.ok) {
                    setTokenError("Invalid or expired reset token.");
                }
            } catch (err) {
                setTokenError("Network error validating token.");
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleReset = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setToast({ message: "Passwords do not match. Please try again.", type: "error" });
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`http://localhost:8000/api/v1/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, new_password: password }),
            });

            const data = await res.json();

            if (res.ok) {
                setToast({ message: data.message || "Password successfully changed!", type: "success" });
                setTimeout(() => navigate('/login'), 2000);
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
                    <h1 className="font-display font-bold text-2xl text-brand-900 mb-1">Set New Password</h1>

                    {isValidating ? (
                        <p className="text-sm text-brand-600 my-6">Validating token...</p>
                    ) : tokenError ? (
                        <div className="my-6 p-4 rounded bg-red-50 text-red-700 text-sm">
                            {tokenError}
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-brand-400 mb-6">Enter your new strong password below.</p>
                            <form onSubmit={handleReset} className="space-y-4">
                                {/* New Password Field */}
                                <div>
                                    <label className="block text-sm font-medium text-brand-700 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input-field pr-10"
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-3 flex items-center text-brand-400 hover:text-brand-700 transition-colors"
                                            tabIndex={-1}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div>
                                    <label className="block text-sm font-medium text-brand-700 mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="input-field pr-10"
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-3 flex items-center text-brand-400 hover:text-brand-700 transition-colors"
                                            tabIndex={-1}
                                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {/* Inline mismatch hint */}
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="mt-1.5 text-xs text-red-500">Passwords do not match.</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary w-full py-3"
                                    disabled={loading}
                                >
                                    {loading ? "Resetting..." : "Reset Password"}
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