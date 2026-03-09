import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    Settings,
    Shield,
    Database,
    Calendar,
    Loader2,
    Plus,
    Search,
    ArrowLeft,
    MessageSquare,
    FileCheck,
    Download,
    X,
    Trash2,
    CheckCircle,
    XCircle,
    Activity,
    BarChart3,
    Terminal,
    Cpu,
    HardDrive,
    FileText,
    TrendingUp,
    ShieldAlert,
    History,
    Archive,
    ShieldOff,
    RefreshCw
} from 'lucide-react';
import { API_URL, NOUN_ELEARN_URL, AWS_LAUNCH_URL } from '../lib/config';
import RoleManagement from '../components/RoleManagement';
import SystemSettings from '../components/SystemSettings';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Tab = 'overview' | 'users' | 'labs' | 'bookings' | 'roles' | 'feedback' | 'settings' | 'submissions' | 'monitoring' | 'audit_logs' | 'recycle_bin';

const AdminManagement: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [labs, setLabs] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const isAdmin = user?.role === 'admin';
    const isFacilitator = user?.role === 'facilitator';

    // --- State for Modals ---
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userFormData, setUserFormData] = useState({ 
        name: '', email: '', username: '', password: '', role: 'student', status: 'enrolled', programmes: [] as string[], studentId: '' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [feedbackToDelete, setFeedbackToDelete] = useState<any>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteType, setDeleteType] = useState<'soft' | 'permanent'>('soft');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [bookingActionLoading, setBookingActionLoading] = useState(false);
    const [isFacilitatorBookingOpen, setIsFacilitatorBookingOpen] = useState(false);
    const [facilitatorBookingData, setFacilitatorBookingData] = useState({ 
        labId: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '11:00', purpose: '' 
    });

    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'facilitator' && user.role !== 'lab technician')) {
            navigate('/dashboard'); return;
        }
        if (isFacilitator && ['overview', 'monitoring', 'audit_logs', 'settings', 'recycle_bin', 'roles'].includes(activeTab)) {
            setActiveTab('users'); return;
        }
        setData([]); setSelectedIds([]);
        fetchData(); fetchLabsOnly(); fetchRoles();
    }, [activeTab, user, navigate, token]);

    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_URL}/api/roles`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setRoles(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchLabsOnly = async () => {
        try {
            const res = await fetch(`${API_URL}/api/labs`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setLabs(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            let ep = '';
            switch (activeTab) {
                case 'overview': await fetchOverviewData(); setIsLoading(false); return;
                case 'users': ep = '/api/users'; break;
                case 'recycle_bin': ep = '/api/users/deleted'; break;
                case 'labs': ep = '/api/labs'; break;
                case 'bookings': ep = '/api/bookings'; break;
                case 'feedback': ep = '/api/users/feedback'; break;
                case 'submissions': ep = '/api/submissions/all'; break;
                case 'monitoring':
                case 'audit_logs': await fetchMonitoringData(); setIsLoading(false); return;
                default: setIsLoading(false); return;
            }
            const res = await fetch(`${API_URL}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setData(await res.json());
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const fetchOverviewData = async () => {
        try {
            const [sRes, lRes] = await Promise.all([
                fetch(`${API_URL}/api/monitoring/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/monitoring/logs?limit=10`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            if (sRes.ok) setStats(await sRes.json());
            if (lRes.ok) { const ld = await lRes.json(); setLogs(ld.logs || []); }
        } catch (e) { console.error(e); }
    };

    const fetchMonitoringData = async () => {
        try {
            const [hRes, lRes] = await Promise.all([
                fetch(`${API_URL}/api/monitoring/health`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/monitoring/logs?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            if (hRes.ok) setHealth(await hRes.json());
            if (lRes.ok) { const ld = await lRes.json(); setLogs(ld.logs || []); }
        } catch (e) { console.error(e); }
    };

    const hasPerm = (p: string) => isAdmin || user?.permissions?.includes(p) || false;

    const toggleSelectAll = () => {
        const selectableItems = activeTab === 'users' ? data.filter(u => u.role !== 'admin') : data;
        const selectableIds = selectableItems.map(i => i._id);
        
        if (selectedIds.length === selectableIds.length && selectableIds.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(selectableIds);
        }
    };

    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const handleAddUser = () => { setSelectedUser(null); setUserFormData({ name: '', email: '', username: '', password: '', role: 'student', status: 'enrolled', programmes: [], studentId: '' }); setFormError(''); setIsUserModalOpen(true); };
    const handleEditUser = (u: any) => { setSelectedUser(u); setUserFormData({ name: u.name || '', email: u.email || '', username: u.username || '', password: '', role: u.role || 'student', status: u.status || 'enrolled', programmes: u.programmes || [], studentId: u.studentId || '' }); setFormError(''); setIsUserModalOpen(true); };
    const openDeleteModal = (u: any) => { setUserToDelete(u); setFeedbackToDelete(null); setDeleteReason(''); setDeleteType('soft'); setIsDeleteModalOpen(true); };
    const openFeedbackDeleteModal = (f: any) => { setFeedbackToDelete(f); setUserToDelete(null); setDeleteReason(''); setDeleteType('permanent'); setIsDeleteModalOpen(true); };
    const openBulkDeleteModal = () => { 
        if (selectedIds.length === 0) return; 
        if (activeTab === 'feedback') {
            setFeedbackToDelete({ subject: `${selectedIds.length} feedback records` });
            setUserToDelete(null);
        } else {
            setUserToDelete({ name: `${selectedIds.length} users` });
            setFeedbackToDelete(null);
        }
        setDeleteReason(''); 
        setDeleteType(activeTab === 'feedback' ? 'permanent' : 'soft'); 
        setIsDeleteModalOpen(true); 
    };

    const downloadCsvTemplate = () => {
        const headers = 'name,email,username,password,role,programmes';
        const sample = 'John Doe,john@example.com,jdoe,Pass123,student,"Artificial Intelligence;Cybersecurity"';
        const blob = new Blob([[headers, sample].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'acetel_enrollment_template.csv';
        a.click();
    };

    const processDelete = async () => {
        if (!deleteReason.trim()) { alert('Reason required'); return; }
        if (deleteReason.trim().length < 5) { alert('Reason must be at least 5 characters'); return; }
        setIsDeleting(true);
        try {
            let res;
            // Case 1: Bulk Deletion (one or more selected via checkboxes)
            if (selectedIds.length > 0) {
                if (activeTab === 'feedback') {
                    res = await fetch(`${API_URL}/api/users/feedback/bulk-delete`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
                        body: JSON.stringify({ feedbackIds: selectedIds, reason: deleteReason }) 
                    });
                } else {
                    res = await fetch(`${API_URL}/api/users/bulk-delete`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
                        body: JSON.stringify({ userIds: selectedIds, reason: deleteReason, action: deleteType }) 
                    });
                }
            } 
            // Case 2: Individual Feedback Deletion (via trash icon)
            else if (feedbackToDelete && feedbackToDelete._id) {
                res = await fetch(`${API_URL}/api/users/feedback/${feedbackToDelete._id}`, { 
                    method: 'DELETE', 
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
                    body: JSON.stringify({ reason: deleteReason }) 
                });
            } 
            // Case 3: Individual User Deletion (via terminate button)
            else if (userToDelete && userToDelete._id) {
                res = await fetch(`${API_URL}/api/users/${userToDelete._id}`, { 
                    method: 'DELETE', 
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
                    body: JSON.stringify({ reason: deleteReason, action: deleteType }) 
                });
            }

            if (res && res.ok) { 
                setIsDeleteModalOpen(false); 
                setSelectedIds([]); 
                setFeedbackToDelete(null);
                setUserToDelete(null);
                fetchData(); 
            } else if (res) {
                const err = await res.json();
                alert(err.message || 'Deletion failed');
            }
        } catch (e: any) { 
            console.error(e); 
            alert('Connection error: ' + e.message);
        } finally { 
            setIsDeleting(false); 
        }
    };

    const handleRestore = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/users/restore/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) fetchData();
        } catch (e) { console.error(e); }
    };

    const handleBulkUpload = async (e: React.FormEvent) => {
        e.preventDefault(); if (!bulkFile) return;
        setIsSubmitting(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const text = ev.target?.result as string;
                const lines = text.split('\n');
                const headers = lines[0].split(',');
                const users = lines.slice(1).filter(l => l.trim()).map(line => {
                    const values = line.split(',');
                    const obj: any = {};
                    headers.forEach((h, i) => {
                        const k = h.trim().toLowerCase();
                        if (k === 'programmes') obj[k] = values[i]?.split(';') || [];
                        else obj[k] = values[i]?.trim();
                    });
                    return obj;
                });
                const res = await fetch(`${API_URL}/api/users/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ users }) });
                const r = await res.json();
                if (res.ok) { alert(`Created: ${r.created}`); setIsBulkModalOpen(false); fetchData(); }
            } catch (e) { alert('Error'); } finally { setIsSubmitting(false); }
        };
        reader.readAsText(bulkFile);
    };

    const handleUserFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); 
        console.log('[handleUserFormSubmit] Starting submission...', userFormData);
        setIsSubmitting(true);
        setFormError('');
        try {
            const method = selectedUser ? 'PUT' : 'POST';
            const ep = selectedUser ? `/api/users/${selectedUser._id}` : '/api/users';
            console.log(`[handleUserFormSubmit] Calling ${method} ${ep}`);
            const res = await fetch(`${API_URL}${ep}`, { 
                method, 
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
                body: JSON.stringify(userFormData) 
            });
            
            console.log(`[handleUserFormSubmit] Response status: ${res.status}`);
            if (res.ok) { 
                console.log('[handleUserFormSubmit] Success!');
                setIsUserModalOpen(false); 
                fetchData(); 
                alert(selectedUser ? 'Update successful' : 'Enrollment successful');
            }
            else { 
                const r = await res.json(); 
                console.error('[handleUserFormSubmit] Failed:', r);
                setFormError(r.message || 'Failed'); 
                alert(`Error: ${r.message || 'Enrollment failed'}`);
            }
        } catch (e: any) { 
            console.error('[handleUserFormSubmit] Exception:', e);
            setFormError(e.message); 
            alert(`Exception: ${e.message}`);
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const openUserLogs = async (u: any) => {
        setSelectedUser(u); setIsLogsModalOpen(true); setIsLoadingLogs(true);
        try {
            const res = await fetch(`${API_URL}/api/monitoring/logs?userId=${u._id}&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { const r = await res.json(); setUserLogs(r.logs || []); }
        } catch (e) { console.error(e); } finally { setIsLoadingLogs(false); }
    };

    const toggleProgramme = (p: string) => setUserFormData(prev => ({ ...prev, programmes: prev.programmes.includes(p) ? prev.programmes.filter(i => i !== p) : [...prev.programmes, p] }));

    const handleDownload = async (sid: string, idx: number, name: string) => {
        try {
            const res = await fetch(`${API_URL}/api/submissions/download/${sid}/${idx}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { const b = await res.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); }
        } catch (e) { console.error(e); }
    };

    const updateBookingStatus = async (id: string, status: string, note: string = '', extras: any = {}) => {
        setBookingActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status, adminNote: note, ...extras }) });
            if (res.ok) { alert('Action successful'); setIsBookingModalOpen(false); fetchData(); }
        } catch (e) { console.error(e); } finally { setBookingActionLoading(false); }
    };

    const deleteBooking = async (id: string) => {
        if (!window.confirm('Purge?')) return;
        try {
            const res = await fetch(`${API_URL}/api/bookings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { alert('Purged'); setIsBookingModalOpen(false); fetchData(); }
        } catch (e) { console.error(e); }
    };

    const handleFacilitatorBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setBookingActionLoading(true);
        try {
            const start = new Date(`${facilitatorBookingData.date}T${facilitatorBookingData.startTime}`).toISOString();
            const end = new Date(`${facilitatorBookingData.date}T${facilitatorBookingData.endTime}`).toISOString();
            const res = await fetch(`${API_URL}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ lab: facilitatorBookingData.labId, startTime: start, endTime: end, purpose: facilitatorBookingData.purpose }) });
            if (res.ok) { alert('Request submitted'); setIsFacilitatorBookingOpen(false); }
        } catch (e) { console.error(e); } finally { setBookingActionLoading(false); }
    };

    const handleExport = (f: 'csv' | 'pdf') => {
        const ts = new Date().toISOString().split('T')[0];
        const fn = `acetel_${activeTab}_${ts}`;
        if (f === 'csv') {
            const h = 'Name,Email,Role,Status';
            const r = data.map(i => `${i.name},${i.email},${i.role},${i.status}`);
            const b = new Blob([[h, ...r].join('\n')], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${fn}.csv`; a.click();
        } else {
            const doc = new jsPDF(); doc.text(`ACETEL - ${activeTab.toUpperCase()}`, 14, 15);
            autoTable(doc, { head: [['Name', 'Email', 'Role', 'Status']], body: data.map(i => [i.name, i.email, i.role, i.status]), startY: 25, headStyles: { fillColor: [22, 163, 74] } });
            doc.save(`${fn}.pdf`);
        }
    };

    // --- RENDERS ---
    const renderOverviewTab = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm"><div className="flex items-center gap-4 mb-2"><div className="p-3 bg-green-50 rounded-2xl text-green-600"><Users className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Users</span></div><p className="text-3xl font-black text-slate-900">{stats?.users || 0}</p></div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm"><div className="flex items-center gap-4 mb-2"><div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Activity className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span></div><p className="text-3xl font-black text-slate-900">{stats?.activeSessions || 0}</p></div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm"><div className="flex items-center gap-4 mb-2"><div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><FileCheck className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasks</span></div><p className="text-3xl font-black text-slate-900">{stats?.submissions || 0}</p></div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm"><div className="flex items-center gap-4 mb-2"><div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><MessageSquare className="w-6 h-6" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Feedback</span></div><p className="text-3xl font-black text-slate-900">{stats?.feedback || 0}</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col"><div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between"><h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><History className="w-5 h-5 text-green-600" />Summary</h3></div><div className="p-6 space-y-4">{logs.slice(0, 5).map((l: any) => (<div key={l._id} className="flex gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100"><div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${l.severity === 'error' ? 'bg-red-500' : 'bg-green-500'}`} /><div><p className="text-xs font-bold text-slate-700">{l.message}</p></div></div>))}</div></div>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"><div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3"><TrendingUp className="w-5 h-5 text-blue-600" /><h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">System Pulse</h3></div><div className="p-8 space-y-6"><div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-slate-400">Memory</span><span className="text-blue-600">{health?.memory?.percentage || '0%'}</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: health?.memory?.percentage }} /></div></div></div>
            </div>
        </div>
    );

    const renderUserTab = () => (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-96"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search identities..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[1.5rem] font-bold shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <div className="flex gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"><button onClick={() => handleExport('csv')} className="px-4 py-4 hover:bg-slate-50 border-r border-slate-100 transition-colors"><Download className="w-4 h-4 text-slate-400" /></button><button onClick={() => handleExport('pdf')} className="px-4 py-4 hover:bg-slate-50 transition-colors"><FileText className="w-4 h-4 text-slate-400" /></button></div>
                    {hasPerm('manage_users') && <div className="flex gap-2"><button onClick={() => setIsBulkModalOpen(true)} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-slate-900/10 flex items-center gap-2"><Plus className="w-4 h-4" />Bulk</button><button onClick={handleAddUser} className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-green-900/10 flex items-center gap-2"><Plus className="w-4 h-4" />Enroll</button></div>}
                </div>
            </div>
            {selectedIds.length > 0 && <div className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] flex items-center justify-between animate-in slide-in-from-top-2"><p className="text-[10px] font-black uppercase tracking-widest">{selectedIds.length} selected identities</p><div className="flex gap-3"><button onClick={openBulkDeleteModal} className="px-6 py-2 bg-red-600 rounded-xl text-[10px] font-black uppercase">Terminate Selected</button><button onClick={() => setSelectedIds([])} className="p-2 hover:bg-white/10 rounded-xl"><X className="w-4 h-4" /></button></div></div>}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto"><table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-8 py-6 text-left"><input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500" /></th><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</th><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Access</th><th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{Array.isArray(data) && data.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map((u: any) => (<tr key={u._id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(u._id) ? 'bg-green-50/30' : ''}`}><td className="px-8 py-6">{u.role !== 'admin' ? <input type="checkbox" checked={selectedIds.includes(u._id)} onChange={() => toggleSelect(u._id)} className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500" /> : <div className="w-4 h-4" />}</td><td className="px-8 py-6"><div className="font-black text-slate-900 tracking-tight">{u.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{u.email}</div></td><td className="px-8 py-6"><span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">{u.role}</span></td><td className="px-8 py-6"><div className="flex gap-4 justify-end">{isAdmin && <button onClick={() => openUserLogs(u)} className="text-blue-600 hover:text-blue-700 font-black text-[10px] uppercase transition-all flex items-center gap-2"><History className="w-3 h-3" />Logs</button>} {u.role !== 'admin' && (isAdmin || (isFacilitator)) && <button onClick={() => handleEditUser(u)} className="text-green-600 hover:text-green-700 font-black text-[10px] uppercase transition-all flex items-center gap-2"><FileText className="w-3 h-3" />Update</button>} {u.role !== 'admin' && isAdmin && <button onClick={() => openDeleteModal(u)} className="text-red-600 hover:text-red-700 font-black text-[10px] uppercase transition-all flex items-center gap-2"><Trash2 className="w-3 h-3" />Terminate</button>}</div></td></tr>))}</tbody>
                </table></div>
            </div>
        </div>
    );

    const renderRecycleBinTab = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center"><h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><Trash2 className="w-5 h-5 text-red-600" />Recycle Bin</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.length} archived accounts</p></div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Terminated identity</th><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th><th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{Array.isArray(data) && data.map((u: any) => (<tr key={u._id} className="hover:bg-red-50/30 transition-colors"><td className="px-8 py-6"><div className="font-black text-slate-900">{u.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{u.email}</div></td><td className="px-8 py-6 text-xs font-bold text-slate-600 italic">"{u.deletionReason || 'N/A'}"</td><td className="px-8 py-6 text-right"><div className="flex gap-4 justify-end"><button onClick={() => handleRestore(u._id)} className="text-green-600 font-black text-[10px] uppercase transition-all flex items-center gap-2"><RefreshCw className="w-3 h-3" />Restore</button><button onClick={() => { setUserToDelete(u); setDeleteReason(''); setDeleteType('permanent'); setIsDeleteModalOpen(true); }} className="text-red-600 font-black text-[10px] uppercase transition-all flex items-center gap-2"><Trash2 className="w-3 h-3" />Purge</button></div></td></tr>))}</tbody>
                </table></div>
            </div>
        </div>
    );

    const renderMonitoringTab = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group"><div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><Cpu className="w-24 h-24" /></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Cpu className="w-3 h-3 text-green-600" />Processor</p><div className="space-y-1"><p className="text-sm font-black text-slate-900">{health?.cpu?.model || 'Detecting...'}</p></div></div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group"><div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><Activity className="w-24 h-24" /></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity className="w-3 h-3 text-blue-600" />Memory</p><div className="space-y-1"><p className="text-sm font-black text-slate-900">{health?.memory?.percentage || '0%'}</p></div></div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group"><div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><HardDrive className="w-24 h-24" /></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><HardDrive className="w-3 h-3 text-amber-600" />Storage</p><div className="space-y-1"><p className="text-sm font-black text-slate-900">{health?.storage?.usage || 'N/A'}</p></div></div>
            </div>
            <div className="bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800">
                <div className="px-8 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50"><div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500/20" /><div className="w-3 h-3 rounded-full bg-amber-500/20" /><div className="w-3 h-3 rounded-full bg-green-500/20" /></div><div className="flex items-center gap-3"><Terminal className="w-4 h-4 text-slate-500" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Monitor Console</span></div><div className="w-12" /></div>
                <div className="p-6 font-mono text-[11px] h-[500px] overflow-y-auto custom-scrollbar">{logs.map((log: any) => (<div key={log._id} className="flex gap-6 py-1.5 group border-b border-slate-900/50"><span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toISOString()}]</span><span className={`font-bold uppercase w-16 shrink-0 ${log.severity === 'error' ? 'text-red-400' : 'text-blue-400'}`}>{log.severity}</span><span className="text-slate-200 group-hover:text-white transition-colors">{log.message}</span></div>))}</div>
            </div>
        </div>
    );

    const renderLabsTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.isArray(data) && data.map((l: any) => (
                <div key={l._id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm group hover:border-green-300 transition-all hover:shadow-xl"><div className="flex justify-between items-start mb-8"><div className="p-5 bg-green-50 rounded-3xl group-hover:bg-green-600 group-hover:text-white transition-colors"><Database className="w-8 h-8" /></div><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${l.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{l.status}</span></div><h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{l.name}</h3><p className="text-slate-500 text-xs mb-8 leading-relaxed line-clamp-2">{l.description}</p><div className="flex gap-3"><button onClick={() => window.open(AWS_LAUNCH_URL, '_blank')} className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg shadow-green-900/10">Modify</button><button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase transition-all hover:bg-slate-50">Config</button></div></div>
            ))}
        </div>
    );

    const renderBookingsTab = () => (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto"><table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility</th><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th><th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Control</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{Array.isArray(data) && data.map((b: any) => (<tr key={b._id} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-6 font-black text-slate-900">{b.user?.name}</td><td className="px-8 py-6 text-green-600 font-black text-[10px] uppercase tracking-tight">{b.lab?.name}</td><td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${b.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{b.status}</span></td><td className="px-8 py-6 text-right"><button onClick={() => { setSelectedBooking(b); setIsBookingModalOpen(true); }} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm">Control</button></td></tr>))}</tbody>
            </table></div>
        </div>
    );

    const renderFeedbackTab = () => (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={toggleSelectAll} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select All</span>
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && <button onClick={openBulkDeleteModal} className="px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-900/10 flex items-center gap-2 animate-in slide-in-from-right-2"><Trash2 className="w-4 h-4" /> Bulk Purge ({selectedIds.length})</button>}
                    <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"><button onClick={() => handleExport('csv')} className="px-4 py-4 hover:bg-slate-50 border-r border-slate-100 transition-all flex items-center gap-2"><Download className="w-4 h-4 text-slate-400" /><span className="text-[10px] font-black text-slate-400 uppercase">Export CSV</span></button><button onClick={() => handleExport('pdf')} className="px-4 py-4 hover:bg-slate-50 transition-all flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /><span className="text-[10px] font-black text-slate-400 uppercase">Export PDF</span></button></div>
                </div>
            </div>
            {Array.isArray(data) && data.map((f: any) => (
                <div key={f._id} className={`bg-white rounded-[2.5rem] p-8 border transition-all relative group flex gap-6 ${selectedIds.includes(f._id) ? 'border-blue-400 bg-blue-50/10' : 'border-slate-200 shadow-sm hover:border-blue-200'}`}>
                    <div className="pt-2"><input type="checkbox" checked={selectedIds.includes(f._id)} onChange={() => toggleSelect(f._id)} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" /></div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-blue-50 rounded-3xl flex items-center justify-center"><MessageSquare className="w-7 h-7 text-blue-600" /></div>
                                <div><h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{f.subject}</h4><p className="text-[10px] text-slate-400 font-black uppercase mt-1">From {f.userName || f.userEmail}</p></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{f.category}</span>
                                {isAdmin && <button onClick={() => openFeedbackDeleteModal(f)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>}
                            </div>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">{f.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSubmissionsTab = () => (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Researcher</th><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</th><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th><th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Review</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{Array.isArray(data) && data.map((s: any) => (<tr key={s._id} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-6"><div className="font-black text-slate-900 tracking-tight">{s.student?.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{s.student?.email}</div></td><td className="px-8 py-6"><div className="text-xs font-black text-slate-700 uppercase tracking-tight">{s.title}</div><div className="text-[10px] text-green-600 font-black uppercase tracking-tighter">{s.lab?.name}</div></td><td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${s.gradingStatus === 'graded' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{s.gradingStatus}</span></td><td className="px-8 py-6 text-right"><div className="flex gap-4 justify-end"><button onClick={() => { const f = s.files[0]; if (f) handleDownload(s._id, 0, f.name); }} className="text-green-600 hover:text-green-700 font-black text-[10px] uppercase transition-all flex items-center gap-2"><Download className="w-4 h-4" /> Download</button></div></td></tr>))}</tbody>
            </table></div>
        </div>
    );

    const renderAuditLogsTab = () => (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><ShieldAlert className="w-5 h-5 text-red-600" />Security & Audit Trails</h3></div>
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th><th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</th><th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th><th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{Array.isArray(logs) && logs.map((log: any) => (<tr key={log._id} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-5 text-[10px] font-bold text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</td><td className="px-8 py-5"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">{log.eventType}</span></td><td className="px-8 py-5 text-xs font-bold text-slate-700">{log.userId?.name || 'SYSTEM'}</td><td className="px-8 py-5 text-xs text-slate-500 font-medium">{log.message}</td></tr>))}</tbody>
            </table></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/30 text-slate-900">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-white/80"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5"><div className="flex items-center justify-between"><div className="flex items-center gap-6"><button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all active:scale-95 shadow-sm"><ArrowLeft className="w-5 h-5 text-slate-600" /></button><div><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">ACETEL Virtual Laboratory</h1><p className="text-green-600 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Administrative Authorization Active</p></div></div><div className="hidden lg:flex items-center gap-10"><div className="flex items-center gap-3 px-6 py-2.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10"><Shield className="w-4 h-4 text-green-500" /><span className="text-[10px] font-black uppercase tracking-widest">Level 4 Access</span></div></div></div></div></header>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-10">
                <aside className="w-full lg:w-72 space-y-3">
                    {!isFacilitator && <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'overview' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><BarChart3 className="w-5 h-5" />Overview</div></button>}
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'users' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><Users className="w-5 h-5" />Identities</div></button>
                    <button onClick={() => setActiveTab('labs')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'labs' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><Database className="w-5 h-5" />Facilites</div></button>
                    <button onClick={() => setActiveTab('bookings')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'bookings' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><Calendar className="w-5 h-5" />Reservations</div></button>
                    {!isFacilitator && <><div className="py-4 px-8"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">System Intelligence</p></div>
                    <button onClick={() => setActiveTab('monitoring')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'monitoring' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><Activity className="w-5 h-5" />Real-time</div></button>
                    <button onClick={() => setActiveTab('audit_logs')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'audit_logs' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><History className="w-5 h-5" />Audit Trails</div></button>
                    <button onClick={() => setActiveTab('recycle_bin')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'recycle_bin' ? 'bg-red-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-red-600'}`}><div className="flex items-center gap-4"><Trash2 className="w-5 h-5" />Recycle Bin</div></button></>}
                    {isFacilitator && <button onClick={() => setIsFacilitatorBookingOpen(true)} className="w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group text-slate-500 hover:bg-white hover:text-green-600"><div className="flex items-center gap-4"><Calendar className="w-5 h-5" />Book Lab</div></button>}
                    <div className="py-4 px-8"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Parameters</p></div>
                    {hasPerm('manage_roles') && <button onClick={() => setActiveTab('roles')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'roles' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><Shield className="w-5 h-5" />Role Matrix</div></button>}
                    {hasPerm('view_submissions') && <button onClick={() => window.open(NOUN_ELEARN_URL, '_blank')} className="w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group text-slate-500 hover:bg-white hover:text-green-600"><div className="flex items-center gap-4"><FileCheck className="w-5 h-5" />Submissions</div></button>}
                    {hasPerm('view_feedback') && <button onClick={() => setActiveTab('feedback')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'feedback' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><MessageSquare className="w-5 h-5" />Feedback</div></button>}
                    {hasPerm('manage_settings') && <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all group ${activeTab === 'settings' ? 'bg-green-600 text-white shadow-2xl translate-x-2' : 'text-slate-500 hover:bg-white hover:text-green-600'}`}><div className="flex items-center gap-4"><Settings className="w-5 h-5" />Settings</div></button>}
                </aside>
                <section className="flex-1 min-w-0">{isLoading ? <div className="h-[600px] bg-white rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-6"><Loader2 className="w-12 h-12 text-green-600 animate-spin" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Access Ongoing...</p></div> : <div className="animate-in fade-in slide-in-from-right-4 duration-700">
                    {activeTab === 'overview' && renderOverviewTab()} {activeTab === 'users' && renderUserTab()} {activeTab === 'recycle_bin' && renderRecycleBinTab()} {activeTab === 'labs' && renderLabsTab()} {activeTab === 'bookings' && renderBookingsTab()} {activeTab === 'feedback' && renderFeedbackTab()} {activeTab === 'submissions' && renderSubmissionsTab()} {activeTab === 'monitoring' && renderMonitoringTab()} {activeTab === 'audit_logs' && renderAuditLogsTab()} {activeTab === 'roles' && <RoleManagement />} {activeTab === 'settings' && <SystemSettings />}
                </div>}</section>
            </main>

            {/* Modals */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => !isSubmitting && setIsUserModalOpen(false)} /><div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"><div className="flex justify-between items-center p-10 border-b border-slate-100"><div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedUser ? 'Modify credentials' : 'New identity'}</h2><p className="text-[10px] font-black text-slate-400 uppercase mt-1.5">{selectedUser ? 'Updating existing identity' : 'Configuring new system access protocol'}</p></div><button onClick={() => setIsUserModalOpen(false)} className="p-4 hover:bg-slate-50 rounded-2xl transition-all active:scale-95"><X className="w-6 h-6 text-slate-400" /></button></div><div className="flex-1 overflow-y-auto p-10 pt-6">{formError && <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4"><ShieldAlert className="w-6 h-6 text-red-600" /><p className="text-red-600 text-xs font-black uppercase">{formError}</p></div>}<form onSubmit={handleUserFormSubmit} className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Identity</label><input type="text" required value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold" /></div><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Email</label><input type="email" required value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold" /></div><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Username</label><input type="text" required value={userFormData.username} onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold" /></div><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Password</label><input type="password" required={!selectedUser} value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold" /></div><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Role</label><select required value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold appearance-none cursor-pointer hover:border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all">{roles.filter(r => isAdmin || r.name === 'student').map((r: any) => (<option key={r._id} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>))}{roles.length === 0 && <option value="student">Student</option>}</select></div><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Student ID</label><input type="text" value={userFormData.studentId} onChange={(e) => setUserFormData({ ...userFormData, studentId: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold" placeholder="Optional for staff" /></div></div><div className="space-y-4"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Programmes</label><div className="flex flex-wrap gap-3">{['Artificial Intelligence', 'Cybersecurity', 'Management Information System'].filter(prog => isAdmin || user?.programmes?.includes(prog)).map(prog => (<button key={prog} type="button" onClick={() => toggleProgramme(prog)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${userFormData.programmes.includes(prog) ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{prog}</button>))}</div></div><div className="flex gap-5 pt-10"><button type="button" disabled={isSubmitting} onClick={() => setIsUserModalOpen(false)} className="flex-1 py-5 border border-slate-200 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95">Abort</button><button type="submit" disabled={isSubmitting} className="flex-[2] py-5 bg-green-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase flex items-center justify-center gap-3 active:scale-[0.98] shadow-2xl shadow-green-900/20">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}{selectedUser ? 'Commit updates' : 'Authorize Enrollment'}</button></div></form></div></div></div>
            )}

            {isDeleteModalOpen && (userToDelete || feedbackToDelete) && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !isDeleting && setIsDeleteModalOpen(false)} /><div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-10 flex flex-col gap-8"><div className="text-center"><div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6"><ShieldOff className="w-10 h-10 text-red-600" /></div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{feedbackToDelete ? 'Purge Feedback' : 'Terminate Authorization'}</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{feedbackToDelete ? `Record: "${feedbackToDelete.subject}"` : `Target: ${userToDelete.name}`}</p></div><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason (Required)</label><textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-sm min-h-[120px] resize-none" placeholder="Administrative reason..." /></div><div className="grid grid-cols-1 gap-4">{!feedbackToDelete && activeTab !== 'recycle_bin' && <button onClick={() => processDelete()} disabled={isDeleting} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 active:scale-[0.98] shadow-2xl"><Archive className="w-5 h-5" /> Move to Recycle Bin</button>}<button onClick={() => { setDeleteType('permanent'); processDelete(); }} disabled={isDeleting} className="w-full py-5 border border-red-100 text-red-600 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 hover:bg-red-50 active:scale-95 transition-all"><Trash2 className="w-5 h-5" /> Permanent Purge</button><button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase hover:text-slate-600 transition-colors">Cancel</button></div></div></div>
            )}

            {isLogsModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsLogsModalOpen(false)} /><div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"><div className="flex justify-between items-center p-10 border-b border-slate-100 bg-slate-50/50"><div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Activity Matrix</h2><p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 flex items-center gap-2"><Users className="w-3 h-3" /> Trail for: {selectedUser.name}</p></div><button onClick={() => setIsLogsModalOpen(false)} className="p-4 hover:bg-white rounded-2xl shadow-sm"><X className="w-6 h-6 text-slate-400" /></button></div><div className="flex-1 overflow-y-auto p-2 bg-slate-950">{isLoadingLogs ? <div className="h-96 flex flex-col items-center justify-center gap-4 text-green-500"><Loader2 className="w-10 h-10 animate-spin" /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Decrypting...</span></div> : <div className="p-6 font-mono text-[11px] space-y-1">{userLogs.length > 0 ? userLogs.map((l: any) => (<div key={l._id} className="flex gap-6 py-2 border-b border-slate-900/50"><span className="text-slate-600 shrink-0">[{new Date(l.timestamp).toISOString()}]</span><span className={`font-bold uppercase w-16 shrink-0 ${l.severity === 'error' ? 'text-red-400' : 'text-blue-400'}`}>{l.severity}</span><span className="text-slate-200">{l.message}</span></div>)) : <div className="py-20 text-center text-slate-600 font-black uppercase tracking-widest">No data found</div>}</div>}</div></div></div>
            )}

            {isBookingModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => !bookingActionLoading && setIsBookingModalOpen(false)} /><div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-10 flex flex-col"><div className="flex justify-between items-center mb-10"><div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Reservation Control</h2></div><button onClick={() => setIsBookingModalOpen(false)} className="p-4 hover:bg-slate-50 rounded-2xl transition-all shadow-sm active:scale-95"><X className="w-6 h-6 text-slate-400" /></button></div>
                <div className="space-y-6 mb-10">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current End Time</p>
                        <p className="text-sm font-black text-slate-900">{new Date(selectedBooking.endTime).toLocaleTimeString()}</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Extend Session (New End Time)</label>
                        <input 
                            type="time" 
                            className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold"
                            onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const newEnd = new Date(selectedBooking.endTime);
                                newEnd.setHours(parseInt(hours), parseInt(minutes));
                                updateBookingStatus(selectedBooking._id, selectedBooking.status, 'Session extended by Admin', { endTime: newEnd.toISOString() });
                            }}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4"><button onClick={() => updateBookingStatus(selectedBooking._id, 'confirmed', 'Approved')} disabled={bookingActionLoading} className="flex items-center justify-center gap-3 py-5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-green-900/10 active:scale-95 transition-all"><CheckCircle className="w-5 h-5" />Approve</button><button onClick={() => updateBookingStatus(selectedBooking._id, 'cancelled', 'Rejected')} disabled={bookingActionLoading} className="flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-green-900/10 active:scale-95 transition-all"><XCircle className="w-5 h-5" />Reject</button><button onClick={() => { if(window.confirm('Purge?')) deleteBooking(selectedBooking._id); }} disabled={bookingActionLoading} className="col-span-2 flex items-center justify-center gap-3 py-5 border border-red-100 text-red-600 rounded-2xl font-black text-[10px] uppercase active:scale-[0.98] transition-all"><Trash2 className="w-5 h-5" />Purge Record</button></div></div></div>
            )}

            {isFacilitatorBookingOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => !bookingActionLoading && setIsFacilitatorBookingOpen(false)} /><div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-10 overflow-hidden flex flex-col"><div className="flex justify-between items-center mb-8"><div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Lab Reservation</h2></div><button onClick={() => setIsFacilitatorBookingOpen(false)} className="p-4 hover:bg-slate-50 rounded-2xl"><X className="w-6 h-6 text-slate-400" /></button></div><form onSubmit={handleFacilitatorBookingSubmit} className="space-y-6"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Laboratory</label><select required value={facilitatorBookingData.labId} onChange={e => setFacilitatorBookingData({...facilitatorBookingData, labId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold appearance-none"><option value="">Choose Lab</option>{Array.isArray(labs) && labs.map((l: any) => (<option key={l._id} value={l._id}>{l.name}</option>))}</select></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Date</label><input required type="date" value={facilitatorBookingData.date} onChange={e => setFacilitatorBookingData({...facilitatorBookingData, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Purpose</label><input type="text" placeholder="Reason..." value={facilitatorBookingData.purpose} onChange={e => setFacilitatorBookingData({...facilitatorBookingData, purpose: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Start</label><input required type="time" value={facilitatorBookingData.startTime} onChange={e => setFacilitatorBookingData({...facilitatorBookingData, startTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900" /></div><div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase ml-1">End</label><input required type="time" value={facilitatorBookingData.endTime} onChange={e => setFacilitatorBookingData({...facilitatorBookingData, endTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900" /></div></div><button type="submit" disabled={bookingActionLoading} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase shadow-xl transition-all active:scale-[0.98]">{bookingActionLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Submit Reservation'}</button></form></div></div>
            )}

            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => !isSubmitting && setIsBulkModalOpen(false)} /><div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-10 flex flex-col"><div className="flex justify-between items-center mb-8"><div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Bulk Enrollment</h2><p className="text-[10px] font-black text-slate-400 uppercase mt-1.5">Process multiple system identities</p></div><button onClick={() => setIsBulkModalOpen(false)} className="p-4 hover:bg-slate-50 rounded-2xl active:scale-95"><X className="w-6 h-6 text-slate-400" /></button></div><form onSubmit={handleBulkUpload} className="space-y-6"><div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center"><div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase mb-4">Required CSV Format:</p><code className="text-[10px] font-mono text-slate-600 block bg-white p-3 rounded-lg border border-slate-200">name,email,username,password,programmes</code></div><button type="button" onClick={downloadCsvTemplate} className="ml-4 p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all flex flex-col items-center gap-2 group"><Download className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" /><span className="text-[8px] font-black uppercase text-slate-400">Template</span></button></div><input type="file" accept=".csv" required onChange={(e) => setBulkFile(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-10 font-bold text-slate-900 text-center shadow-inner" /><button type="submit" disabled={isSubmitting || !bulkFile} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-all">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Start Bulk Enrollment'}</button></form></div></div>
            )}
        </div>
    );
};

export default AdminManagement;
