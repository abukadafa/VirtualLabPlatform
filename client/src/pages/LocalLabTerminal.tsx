import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useAuth } from '../context/AuthContext';
import { API_URL, WS_URL, NOUN_ELEARN_URL } from '../lib/config';
import { ArrowLeft, Loader2, Monitor, FileCheck } from 'lucide-react';

const LocalLabTerminal: React.FC = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();
    // ... rest of imports and state ...
    const terminalRef = useRef<HTMLDivElement | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vncLoading, setVncLoading] = useState(false);

    const openVncConsole = async () => {
        if (!bookingId || !token) return;
        setVncLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/bookings/${bookingId}/vnc-console`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.url) {
                // Open in a new window with specific dimensions
                window.open(data.url, 'ProxmoxConsole', 'width=1024,height=768');
            } else {
                alert(data.message || 'Failed to generate VNC console. Ensure the VM is running.');
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setVncLoading(false);
        }
    };

    useEffect(() => {
        const loadBooking = async () => {
            if (!token || !bookingId) return;
            try {
                const response = await fetch(`${API_URL}/api/bookings/my-bookings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                const target = Array.isArray(data) ? data.find((item: any) => item._id === bookingId) : null;
                const isStaff = ['admin', 'facilitator', 'lab technician'].includes(user?.role || '');

                if (!target || (target.provisioningType !== 'local' && !target.localProvisioning?.ipAddress)) {
                    setError('Local lab terminal is not available for this booking.');
                    return;
                }

                const isOwner = target.user === user?.id || (typeof target.user === 'object' && target.user?._id === user?.id);
                if (!isOwner && !isStaff) {
                    setError('Access Denied. You do not have permission to view this laboratory terminal.');
                    return;
                }

                if (target.provisioningType !== 'local') {
                    setError('This booking is not configured for local terminal access.');
                    return;
                }

                if (target.provisioningStatus === 'deleted' || target.provisioningStatus === 'expired' || target.status === 'completed') {
                    setError('This lab booking has expired or has already been cleaned up.');
                    return;
                }

                if (target.approvalStatus !== 'approved') {
                    setError(`This booking is not yet approved (Current Status: ${target.approvalStatus || 'pending'}).`);
                    return;
                }

                setBooking(target);

                if (target.provisioningStatus !== 'provisioned') {
                    const statusMsg = target.provisioningStatus === 'failed' 
                        ? `Provisioning failed: ${target.adminNote || 'Please contact a lab technician.'}` 
                        : `Lab provisioning is still in progress (Current Status: ${target.provisioningStatus || 'pending'}).`;
                    setError(statusMsg);
                    return;
                }
            } catch (fetchError: any) {
                setError(fetchError.message);
            } finally {
                setLoading(false);
            }
        };

        loadBooking();
    }, [bookingId, token]);

    useEffect(() => {
        if (!booking || !terminalRef.current || !token) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            theme: {
                background: '#020617',
                foreground: '#e2e8f0',
            },
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();
        term.writeln(`Connecting to ${booking.localProvisioning?.ipAddress || 'local VM'}...`);

        const ws = new WebSocket(`${WS_URL}/ws/terminal?token=${encodeURIComponent(token)}&bookingId=${encodeURIComponent(booking._id)}`);

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'data') {
                term.write(message.data);
            } else if (message.type === 'error') {
                term.writeln(`\r\n[error] ${message.message}`);
                setError(message.message);
            } else if (message.type === 'ready') {
                term.writeln('\r\nConnected.\r\n');
            }
        };

        ws.onclose = () => {
            term.writeln(`\r\nConnection closed.`);
        };

        term.onData((data) => {
            ws.send(JSON.stringify({ type: 'input', data }));
        });

        const handleResize = () => {
            fitAddon.fit();
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
            }
        };

        window.addEventListener('resize', handleResize);

        wsRef.current = ws;
        termRef.current = term;
        fitRef.current = fitAddon;

        return () => {
            window.removeEventListener('resize', handleResize);
            ws.close();
            term.dispose();
        };
    }, [booking, token]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                    <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-bold">
                        <ArrowLeft className="w-4 h-4" />
                        Dashboard
                    </button>
                    <h1 className="mt-3 text-xl font-black uppercase tracking-wide">{booking?.lab?.name || 'Local Lab Terminal'}</h1>
                    <p className="text-xs text-slate-400 mt-1">Host: {booking?.localProvisioning?.ipAddress || 'N/A'} | User: {booking?.localProvisioning?.username || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.open(NOUN_ELEARN_URL, '_blank')}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                    >
                        <FileCheck className="w-3.5 h-3.5" />
                        {user?.role === 'facilitator' || user?.role === 'lab technician' ? 'Post Lab Activities' : 'Submit Task'}
                    </button>
                    <button 
                        onClick={openVncConsole}
                        disabled={vncLoading}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                    >
                        {vncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Monitor className="w-3.5 h-3.5" />}
                        Native Console (No VPN)
                    </button>
                </div>
            </header>
            {error && <div className="mx-6 mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
            <main className="flex-1 p-6">
                <div className="h-[70vh] rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl">
                    <div ref={terminalRef} className="h-full w-full p-3" />
                </div>
            </main>
        </div>
    );
};

export default LocalLabTerminal;
