import React, { useState, useEffect } from 'react';
import {
    Activity,
    Database,
    Cpu,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Server,
    RefreshCcw,
    LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MonitoringDashboard: React.FC = () => {
    const { token } = useAuth();
    // Using healthData instead of status to avoid any potential naming collisions with .status properties
    const [healthData, setHealthData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const fetchStatus = async () => {
        try {
            setRefreshing(true);
            const response = await fetch(`${API_URL}/api/monitoring/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setHealthData(data);
                setError(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
        } catch (err: any) {
            console.error('Monitoring fetch error:', err);
            setError(err.message || 'Could not connect to monitoring service');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCcw className="w-8 h-8 text-acetel-navy animate-spin" />
            </div>
        );
    }

    if (error || !healthData) {
        return (
            <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-400">Connection Error</h3>
                <p className="text-slate-400 mb-6">{error}</p>
                <button
                    onClick={fetchStatus}
                    className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Safely destructure with defaults
    const system = healthData?.system || {};
    const database = healthData?.database || {};
    const redis = healthData?.redis || {};
    const labs = healthData?.labs || {};
    const alerts = healthData?.alerts || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-acetel-navy">
                        <Activity className="w-7 h-7 text-acetel-green" />
                        Infrastructure Health
                    </h2>
                    <p className="text-slate-500 text-sm">Real-time status of system resources and services</p>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={refreshing}
                    className="p-2 hover:bg-gray-100 rounded-xl transition flex items-center gap-2 text-sm text-slate-500"
                >
                    <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Now'}
                </button>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map((alert: any, i: number) => (
                        <div key={i} className={`p-4 rounded-xl border flex items-center gap-4 ${alert?.severity === 'critical'
                                ? 'bg-red-500/10 border-red-500/50 text-red-600'
                                : 'bg-amber-500/10 border-amber-500/50 text-amber-600'
                            }`}>
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="font-bold uppercase text-[10px] tracking-wider mb-0.5">{alert?.severity || 'Alert'}</div>
                                <div className="text-sm">{alert?.message || 'Warning detected'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* CPU & Memory */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Cpu className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">System</span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-slate-500 font-medium">Memory Usage</span>
                                <span className={`${parseFloat(system?.memory?.percent || '0') > 80 ? 'text-red-500' : 'text-green-600'} font-bold`}>
                                    {system?.memory?.percent || '0'}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${parseFloat(system?.memory?.percent || '0') > 80 ? 'bg-red-500' : 'bg-blue-600'}`}
                                    style={{ width: `${system?.memory?.percent || 0}%` }}
                                ></div>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                {system?.memory?.used || '0 B'} / {system?.memory?.total || '0 B'}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <span className="text-xs text-slate-500">Load (1m)</span>
                            <span className="text-sm font-bold text-acetel-navy">{system?.loadAvg?.[0]?.toFixed(2) || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Database */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Database className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Database</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${database?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="font-bold text-lg text-acetel-navy">{database?.status === 'connected' ? 'Operational' : 'Offline'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium space-y-1">
                            <div>INSTANCE: {database?.host || 'N/A'}</div>
                            <div>NAME: {database?.name || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {/* Redis / Cache */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Zap className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Cache (Redis)</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${redis?.status === 'connected' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                            <span className="font-bold text-lg text-acetel-navy">{redis?.status === 'connected' ? 'Healthy' : 'Error'}</span>
                        </div>
                        <p className="text-xs text-slate-400 italic">
                            Used for lab queuing and session state management.
                        </p>
                    </div>
                </div>

                {/* Lab Containers */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Server className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Labs</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-acetel-navy">{labs?.activeContainers || 0}</span>
                            <span className="text-xs text-slate-400 mb-1">/ {labs?.maxContainers || 0} active</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-gray-50">
                            <span className="text-slate-400">QUEUE SIZE</span>
                            <span className="font-bold text-purple-600">{labs?.queue?.waiting || 0} PENDING</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-acetel-navy">
                        <LayoutDashboard className="w-5 h-5 text-blue-600" />
                        Deployment Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Platform</div>
                            <div className="text-sm font-medium text-acetel-navy">{system?.platform || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">CPU Cores</div>
                            <div className="text-sm font-medium text-acetel-navy">{system?.cpuCount || 0} Cores Available</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Uptime</div>
                            <div className="text-sm font-medium text-acetel-navy">{system?.uptime ? (system.uptime / 3600).toFixed(1) : 0} hours</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-acetel-green/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-acetel-green" />
                    </div>
                    <h3 className="text-xl font-bold text-acetel-navy">Cloud Synced</h3>
                    <p className="text-slate-500 text-sm mt-2">All security hooks and monitoring listeners are operational.</p>
                </div>
            </div>
        </div>
    );
};

export default MonitoringDashboard;
