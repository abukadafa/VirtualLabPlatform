import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Lock } from 'lucide-react';
import { API_URL } from '../lib/config';

const ResetPassword: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] shadow-xl p-10">
                <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/10">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-center mb-2 text-slate-900 uppercase tracking-tight">
                    Reset<span className="text-green-600">Password</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] text-center mb-10">Secure Identity Update</p>

                {result && (
                    <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 ${result.type === 'success' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                        {result.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        <p className="text-sm font-bold">{result.message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Secure Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 font-bold"
                            placeholder="••••••••••••"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 font-bold"
                            placeholder="••••••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center disabled:bg-green-400 shadow-lg shadow-green-900/10 group active:scale-[0.98] text-lg uppercase tracking-widest"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
