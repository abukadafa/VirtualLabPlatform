import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Loader2 } from 'lucide-react';

const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' as 'student' | 'facilitator' | 'admin',
        department: '',
        studentId: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    React.useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await register(formData);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at center, #fcfcfc 0%, #e8f4fd 100%)",
            padding: "20px",
            fontFamily: "'Inter', system-ui, sans-serif"
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
                * { box-sizing: border-box; }
            `}</style>
            
            <div style={{ width: "100%", maxWidth: "500px" }}>
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
                            fontSize: "26px", 
                            fontWeight: 800, 
                            color: "#1e3a8a", 
                            marginBottom: "8px",
                            fontFamily: "'Syne', sans-serif"
                        }}>
                            Create Account
                        </h1>
                        <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
                            Join the ACETEL Database Management System
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            marginBottom: "24px",
                            padding: "12px 16px",
                            background: "#fef2f2",
                            border: "1px solid #fee2e2",
                            borderRadius: "12px",
                            color: "#ef4444",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                style={{
                                    width: "100%", padding: "11px 16px", background: "#f8fafc",
                                    border: "1px solid #e2e8f0", borderRadius: "10px",
                                    fontSize: "14px", outline: "none", transition: "all 0.2s"
                                }}
                                onFocus={(e) => e.target.style.border = "1px solid #1e3a8a"}
                                onBlur={(e) => e.target.style.border = "1px solid #e2e8f0"}
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                style={{
                                    width: "100%", padding: "11px 16px", background: "#f8fafc",
                                    border: "1px solid #e2e8f0", borderRadius: "10px",
                                    fontSize: "14px", outline: "none", transition: "all 0.2s"
                                }}
                                onFocus={(e) => e.target.style.border = "1px solid #1e3a8a"}
                                onBlur={(e) => e.target.style.border = "1px solid #e2e8f0"}
                                placeholder="name@acetel.edu.ng"
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                                style={{
                                    width: "100%", padding: "11px 16px", background: "#f8fafc",
                                    border: "1px solid #e2e8f0", borderRadius: "10px",
                                    fontSize: "14px", outline: "none", transition: "all 0.2s"
                                }}
                                onFocus={(e) => e.target.style.border = "1px solid #1e3a8a"}
                                onBlur={(e) => e.target.style.border = "1px solid #e2e8f0"}
                                placeholder="Minimum 6 characters"
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    style={{
                                        width: "100%", padding: "11px 16px", background: "#f8fafc",
                                        border: "1px solid #e2e8f0", borderRadius: "10px",
                                        fontSize: "14px", outline: "none", cursor: "pointer"
                                    }}
                                >
                                    <option value="student">Student</option>
                                    <option value="facilitator">Facilitator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Department</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    style={{
                                        width: "100%", padding: "11px 16px", background: "#f8fafc",
                                        border: "1px solid #e2e8f0", borderRadius: "10px",
                                        fontSize: "14px", outline: "none"
                                    }}
                                    placeholder="e.g. CS"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: "100%",
                                padding: "13px",
                                background: "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "12px",
                                fontSize: "15px",
                                fontWeight: 700,
                                cursor: isLoading ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                boxShadow: "0 10px 15px -3px rgba(30, 58, 138, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                marginTop: "12px"
                            }}
                            onMouseOver={(e) => { if(!isLoading) e.currentTarget.style.background = "#152e72"; }}
                            onMouseOut={(e) => { if(!isLoading) e.currentTarget.style.background = "#1e3a8a"; }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Register'
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: "24px", textAlign: "center" }}>
                        <p style={{ fontSize: "14px", color: "#64748b" }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ color: "#1e3a8a", fontWeight: 700, textDecoration: "none" }}>
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
