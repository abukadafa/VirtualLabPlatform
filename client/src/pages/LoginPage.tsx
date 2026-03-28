import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ChevronRight, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';

const LoginPage: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const { login, user, branding } = useAuth();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
            // Role is auto-detected by backend
            await (login as any)(identifier, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white p-4">
            <div className="w-full max-w-md flex-1 flex items-center justify-center">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-10">
                    <div className="text-center mb-10">
                        <div className="flex justify-center items-center gap-4 mb-8">
                            <img 
                                src={branding?.logoUrl || "https://nou.edu.ng/wp-content/uploads/2021/12/Logo-1.png"} 
                                alt="NOUN Logo" 
                                className="h-16 object-contain" 
                            />
                            <div className="h-10 w-[1px] bg-slate-200"></div>
                            <img 
                                src={branding?.secondaryLogoUrl || "https://nou.edu.ng/wp-content/uploads/2022/02/logo.png"} 
                                alt="ACETEL Logo" 
                                className="h-14 object-contain" 
                            />
                        </div>
                        <h1 className="text-3xl font-black text-primary mb-1 tracking-tight">
                            {branding?.appName?.split(' ')[0] || 'ACETEL'}
                        </h1>
                        <h2 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-tight">
                            {branding?.appName?.split(' ').slice(1).join(' ') || 'Virtual Laboratory Platform'}
                        </h2>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Secure Environment Access</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                            <p className="text-red-600 text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="identifier" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Email or Username
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 font-bold"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 font-bold"
                                placeholder="••••••••••••"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary hover:bg-primary/80 text-white font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center disabled:bg-primary/60 shadow-lg shadow-primary/10 group active:scale-[0.98] text-lg uppercase tracking-widest"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Sign In
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            Official Protected Portal
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LoginPage;