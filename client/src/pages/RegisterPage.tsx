import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';

const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' as 'student' | 'facilitator' | 'admin' | 'lab technician',
        department: '',
        studentId: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register, user, branding } = useAuth();
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
        <div className="min-h-screen flex flex-col bg-white p-4">
            <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center">
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-4 mb-6">
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
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Join the Academic Environment</p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-8 w-full">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                            <p className="text-red-600 text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition font-bold"
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition font-bold"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition font-bold"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Role selection removed to enforce admin-assigned roles. Default is student. */}
                        <div className="hidden">
                            <input type="hidden" value="student" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition font-bold"
                                    placeholder="e.g. CS"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student ID</label>
                                <input
                                    type="text"
                                    value={formData.studentId}
                                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition font-bold"
                                    placeholder="ID Number"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/80 text-white font-black py-4 rounded-2xl transition duration-300 flex items-center justify-center disabled:bg-primary/60 shadow-lg shadow-primary/10 mt-6 group active:scale-[0.98] text-lg uppercase tracking-widest"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Register
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-100">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:text-primary/80 font-black transition ml-1">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RegisterPage;