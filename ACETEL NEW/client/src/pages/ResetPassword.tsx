import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Lock } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setResult({ type: 'error', message: 'Passwords do not match' });
            return;
        }

        if (password.length < 6) {
            setResult({ type: 'error', message: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok) {
                setResult({ type: 'success', message: 'Password reset successful! Redirecting to login...' });
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setResult({ type: 'error', message: data.message || 'Failed to reset password' });
            }
        } catch (error) {
            setResult({ type: 'error', message: 'Connection error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at center, #fcfcfc 0%, #eef2ff 100%)",
            padding: "20px",
            fontFamily: "'Inter', system-ui, sans-serif"
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
                * { box-sizing: border-box; }
            `}</style>

            <div style={{ width: "100%", maxWidth: "440px" }}>
                <div style={{
                    background: "#ffffff",
                    borderRadius: "24px",
                    boxShadow: "0 20px 40px rgba(30, 58, 138, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)",
                    padding: "40px",
                    border: "1px solid rgba(30, 58, 138, 0.05)"
                }}>
                    <div style={{ textAlign: "center", marginBottom: "32px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "24px" }}>
                            <img src="https://nou.edu.ng/wp-content/uploads/2021/12/Logo-1.png" alt="NOUN" style={{ height: "40px", objectFit: "contain" }} />
                            <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />
                            <img src="https://acetel.nou.edu.ng/wp-content/uploads/2022/12/logo.png" alt="ACETEL" style={{ height: "40px", objectFit: "contain" }} />
                        </div>
                        <h1 style={{ 
                            fontSize: "24px", 
                            fontWeight: 800, 
                            color: "#1e3a8a", 
                            marginBottom: "8px",
                            fontFamily: "'Syne', sans-serif"
                        }}>
                            Reset Password
                        </h1>
                        <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>Enter your new password below</p>
                    </div>

                    {result && (
                        <div style={{
                            marginBottom: "24px",
                            padding: "12px 16px",
                            background: result.type === 'success' ? "#f0fdf4" : "#fef2f2",
                            border: `1px solid ${result.type === 'success' ? "#bbf7d0" : "#fee2e2"}`,
                            borderRadius: "12px",
                            color: result.type === 'success' ? "#16a34a" : "#ef4444",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            {result.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            {result.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: "100%", padding: "11px 16px", background: "#f8fafc",
                                    border: "1px solid #e2e8f0", borderRadius: "10px",
                                    fontSize: "14px", outline: "none", transition: "all 0.2s"
                                }}
                                onFocus={(e) => e.target.style.border = "1px solid #1e3a8a"}
                                onBlur={(e) => e.target.style.border = "1px solid #e2e8f0"}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{
                                    width: "100%", padding: "11px 16px", background: "#f8fafc",
                                    border: "1px solid #e2e8f0", borderRadius: "10px",
                                    fontSize: "14px", outline: "none", transition: "all 0.2s"
                                }}
                                onFocus={(e) => e.target.style.border = "1px solid #1e3a8a"}
                                onBlur={(e) => e.target.style.border = "1px solid #e2e8f0"}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "13px",
                                background: "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "12px",
                                fontSize: "15px",
                                fontWeight: 700,
                                cursor: loading ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                boxShadow: "0 10px 15px -3px rgba(30, 58, 138, 0.15)",
                                marginTop: "12px"
                            }}
                            onMouseOver={(e) => { if(!loading) e.currentTarget.style.background = "#152e72"; }}
                            onMouseOut={(e) => { if(!loading) e.currentTarget.style.background = "#1e3a8a"; }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
