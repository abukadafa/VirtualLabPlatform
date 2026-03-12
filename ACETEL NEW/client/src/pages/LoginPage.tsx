import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'student' | 'facilitator' | 'admin'>('student');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, user } = useAuth();
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
            await login(identifier, password, role);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
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
                    boxShadow: "0 20px 40px rgba(0, 35, 102, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)",
                    padding: "40px",
                    border: "1px solid rgba(0, 35, 102, 0.05)"
                }}>
                    <div style={{ textAlign: "center", marginBottom: "32px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "32px" }}>
                            <img src="https://nou.edu.ng/wp-content/uploads/2021/12/Logo-1.png" alt="NOUN" style={{ height: "48px", objectFit: "contain" }} />
                            <div style={{ width: "1px", height: "32px", background: "#e2e8f0" }} />
                            <img src="https://acetel.nou.edu.ng/wp-content/uploads/2022/12/logo.png" alt="ACETEL" style={{ height: "48px", objectFit: "contain" }} />
                        </div>
                        
                        <h1 style={{ 
                            fontSize: "28px", 
                            fontWeight: 800, 
                            color: "#1e3a8a", 
                            marginBottom: "8px",
                            fontFamily: "'Syne', sans-serif"
                        }}>
                            Welcome Back
                        </h1>
                        <p style={{ fontSize: "15px", color: "#64748b", fontWeight: 500 }}>
                            Sign in to access ACETEL Database
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
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        <div>
                            <label htmlFor="identifier" style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                                Email or Username
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    fontSize: "15px",
                                    outline: "none",
                                    transition: "all 0.2s"
                                }}
                                onFocus={(e) => {
                                    e.target.style.border = "1px solid #1e3a8a";
                                    e.target.style.background = "#ffffff";
                                }}
                                onBlur={(e) => {
                                    e.target.style.border = "1px solid #e2e8f0";
                                    e.target.style.background = "#f8fafc";
                                }}
                                placeholder="name@acetel.edu.ng"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    fontSize: "15px",
                                    outline: "none",
                                    transition: "all 0.2s"
                                }}
                                onFocus={(e) => {
                                    e.target.style.border = "1px solid #1e3a8a";
                                    e.target.style.background = "#ffffff";
                                }}
                                onBlur={(e) => {
                                    e.target.style.border = "1px solid #e2e8f0";
                                    e.target.style.background = "#f8fafc";
                                }}
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "12px" }}>
                                Access Level
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                                {(['student', 'facilitator', 'admin'] as const).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        style={{
                                            padding: "8px 4px",
                                            borderRadius: "100px",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            border: role === r ? "2px solid #1e3a8a" : "1px solid #e2e8f0",
                                            background: role === r ? "#1e3a8a" : "transparent",
                                            color: role === r ? "#ffffff" : "#64748b"
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: "100%",
                                padding: "14px",
                                background: "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "100px",
                                fontSize: "16px",
                                fontWeight: 700,
                                cursor: isLoading ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                boxShadow: "0 10px 20px rgba(30, 58, 138, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                            onMouseOver={(e) => { if(!isLoading) e.currentTarget.style.background = "#152e72"; }}
                            onMouseOut={(e) => { if(!isLoading) e.currentTarget.style.background = "#1e3a8a"; }}
                        >
                            {isLoading ? "Authenticating..." : "Sign In"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
