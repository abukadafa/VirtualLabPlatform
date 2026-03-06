import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SystemSettings from '../components/SystemSettings';
import RoleManagement from '../components/RoleManagement';
import {
    Users,
    Calendar,
    CheckCircle,
    XCircle,
    Search,
    UserPlus,
    UserMinus,
    GraduationCap,
    LayoutDashboard,
    Plus,
    UploadCloud,
    FileText,
    AlertCircle,
    X,
    Edit2,
    ShieldCheck,
    Shield,
    Clock,
    BarChart3,
    ClipboardList,
    Award,
    TrendingUp,
    Activity,
    Star,
    MessageSquare,
    Download,
    Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../lib/config';

interface User {
    _id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    status: 'enrolled' | 'completed' | 'inactive';
    programmes: string[];
    studentId?: string;
}

interface Booking {
    _id: string;
    user: { _id: string; name: string; email: string };
    lab: { _id: string; name: string; type: string };
    startTime: string;
    endTime: string;
    status: string;
    purpose?: string;
    adminNote?: string;
    provisionedUrl?: string;
}

interface Submission {
    _id: string;
    student: { _id: string; name: string; email: string; programmes?: string[] };
    lab: { _id: string; name: string; type: string };
    files: { name: string; path: string; size: number; mimeType: string }[];
    submittedAt: string;
    grade?: number;
    feedback?: string;
    status: 'pending' | 'graded';
}

interface AnalyticsData {
    totalSubmissions: number;
    pendingSubmissions: number;
    gradedSubmissions: number;
    gradeStats: { averageGrade: number; highestGrade: number; lowestGrade: number };
    submissionsByLab: { _id: string; count: number; avgGrade: number }[];
    recentActivity: { _id: string; count: number }[];
}

interface Feedback {
    _id: string;
    userName: string;
    userEmail: string;
    userRole: string;
    category: string;
    subject: string;
    message: string;
    createdAt: string;
}

const PROGRAMMES = [
    'Artificial Intelligence',
    'Cybersecurity',
    'Management Information System'
];

const AdminManagement: React.FC = () => {
    const { user, token, refreshBranding } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Helper to check permissions
    const hasPerm = (perm: string) => {
        if (user?.role === 'admin') return true;
        return user?.permissions?.includes(perm) || false;
    };

    // Define available tabs based on permissions
    const tabs = [
        { id: 'users', label: 'Users', icon: Users, perm: 'manage_users' },
        { id: 'bookings', label: 'Bookings', icon: Calendar, perm: 'manage_labs' },
        { id: 'provisioning', label: 'Lab Requests', icon: ShieldCheck, perm: 'provision_labs' },
        { id: 'submissions', label: 'Submissions', icon: ClipboardList, perm: 'view_submissions' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, perm: 'view_analytics' },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare, perm: 'view_feedback' },
        { id: 'roles', label: 'Roles', icon: Shield, perm: 'manage_roles' },
        { id: 'settings', label: 'Settings', icon: SettingsIcon, perm: 'manage_settings' }
    ].filter(tab => hasPerm(tab.perm));

    // Ensure requested tab is allowed, otherwise pick first allowed tab
    const initialTab = location.state?.activeTab || 'users';
    const isTabAllowed = tabs.some(t => t.id === initialTab);

    // Using refreshBranding to suppress the warning since it's passed but not used yet in top-level, 
    // though it's passed to children. We can also just ignore the warning if preferred.
    console.log('AdminManagement loaded, refreshBranding available:', !!refreshBranding);

    const [activeTab, setActiveTab] = useState<string>(
        isTabAllowed ? initialTab : (tabs.length > 0 ? tabs[0].id : 'users')
    );
    const [users, setUsers] = useState<User[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [availableRoles, setAvailableRoles] = useState<{ _id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Add User Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'single' | 'bulk'>('single');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bulkResults, setBulkResults] = useState<{ created: number, failed: number, errors: string[] } | null>(null);

    // Provisioning Modal State
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [selectedBookingForGrant, setSelectedBookingForGrant] = useState<Booking | null>(null);
    const [grantFormData, setGrantFormData] = useState({
        provisionedUrl: '',
        adminNote: ''
    });

    // Edit Credentials Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        username: '',
        role: '',
        password: '',
        programmes: [] as string[]
    });

    // Extension Modal State
    const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    // Submissions & Analytics State
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const handleExportFeedback = () => {
        if (feedbacks.length === 0) return;
        
        const headers = ['Date', 'User Name', 'User Email', 'Role', 'Category', 'Subject', 'Message'];
        const csvContent = [
            headers.join(','),
            ...feedbacks.map(f => [
                new Date(f.createdAt).toLocaleString().replace(/,/g, ''),
                `"${f.userName}"`,
                `"${f.userEmail}"`,
                `"${f.userRole}"`,
                `"${f.category}"`,
                `"${f.subject.replace(/"/g, '""')}"`,
                `"${f.message.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `feedback_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' });
    const [extensionTime, setExtensionTime] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        role: 'student',
        password: '',
        programmes: [] as string[],
        studentId: ''
    });

    const [bulkData, setBulkData] = useState('');
    const [defaultPassword, setDefaultPassword] = useState('Welcome123');

    useEffect(() => {
        fetchData();
    }, [activeTab, token]);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            // Fetch roles for dropdowns
            const rolesRes = await fetch(`${API_URL}/api/roles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (rolesRes.ok) setAvailableRoles(await rolesRes.json());

            if (activeTab === 'users') {
                const response = await fetch(`${API_URL}/api/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) setUsers(await response.json());
            } else if (activeTab === 'bookings') {
                const response = await fetch(`${API_URL}/api/bookings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) setBookings(await response.json());
            } else if (activeTab === 'submissions') {
                const response = await fetch(`${API_URL}/api/submissions/all`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) setSubmissions(await response.json());
            } else if (activeTab === 'analytics') {
                const response = await fetch(`${API_URL}/api/submissions/analytics`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) setAnalytics(await response.json());
            } else if (activeTab === 'provisioning') {
                const response = await fetch(`${API_URL}/api/bookings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const allBookings: Booking[] = await response.json();
                    setBookings(allBookings.filter(b => b.status === 'requested' || b.status === 'granted'));
                }
            } else if (activeTab === 'feedback') {
                const response = await fetch(`${API_URL}/api/users/feedback`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) setFeedbacks(await response.json());
            }
        } catch (error) {
            console.error(`Failed to fetch ${activeTab}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleGradeSubmission = async () => {
        if (!selectedSubmission || !token) return;
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch(`${API_URL}/api/submissions/grade/${selectedSubmission._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    grade: parseFloat(gradeForm.grade),
                    feedback: gradeForm.feedback
                })
            });
            if (response.ok) {
                setSuccess('Submission graded successfully!');
                setTimeout(() => {
                    setIsGradeModalOpen(false);
                    setSuccess(null);
                    setGradeForm({ grade: '', feedback: '' });
                }, 1500);
                fetchData();
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to grade submission');
            }
        } catch (error) {
            setError('Connection error');
        }
    };

    const activeStudents = bookings.filter(b => b.status === 'confirmed').length;

    const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                setSuccess(`User status updated to ${newStatus}`);
                fetchData();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to update user status');
            }
        } catch (error) {
            setError('Connection error');
        }
    };

    const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                setSuccess(`Booking ${newStatus} successfully`);
                fetchData();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to update booking status');
            }
        } catch (error) {
            setError('Connection error');
        }
    };

    const handleExtendBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBooking) return;
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const [hours, minutes] = extensionTime.split(':');
            const newEnd = new Date(selectedBooking.endTime);
            newEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            if (newEnd <= new Date(selectedBooking.endTime)) {
                newEnd.setDate(newEnd.getDate() + 1);
            }

            const response = await fetch(`${API_URL}/api/bookings/${selectedBooking._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ endTime: newEnd.toISOString() })
            });
            if (response.ok) {
                setSuccess('Booking extended successfully!');
                fetchData();
                setTimeout(() => {
                    setIsExtendModalOpen(false);
                    setSuccess(null);
                }, 1500);
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to extend booking');
            }
        } catch (error) {
            setError('Connection error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGrantLab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookingForGrant || !token) return;
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch(`${API_URL}/api/bookings/${selectedBookingForGrant._id}/grant-instance`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(grantFormData)
            });
            if (response.ok) {
                setSuccess('Lab instance granted successfully!');
                fetchData();
                setTimeout(() => {
                    setIsGrantModalOpen(false);
                    setSuccess(null);
                    setGrantFormData({ provisionedUrl: '', adminNote: '' });
                }, 1500);
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to grant lab instance');
            }
        } catch (error) {
            setError('Connection error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickExtend = (mins: number) => {
        if (!selectedBooking) return;
        const currentEnd = new Date(selectedBooking.endTime);
        const newEnd = new Date(currentEnd.getTime() + mins * 60000);
        setExtensionTime(`${newEnd.getHours().toString().padStart(2, '0')}:${newEnd.getMinutes().toString().padStart(2, '0')}`);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                setIsModalOpen(false);
                setFormData({ name: '', username: '', email: '', role: 'student', password: '', programmes: [PROGRAMMES[0]], studentId: '' });
                fetchData();
            } else {
                setError(data.message || 'Failed to add user');
            }
        } catch (error) {
            setError('Connection error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setBulkResults(null);
        setIsSubmitting(true);

        try {
            // Parse CSV-like data: name,username,email,role,programme,studentId
            const lines = bulkData.split('\n').filter(l => l.trim());
            const users = lines.map(line => {
                const [name, username, email, role, programme, studentId] = line.split(',').map(s => s.trim());
                return { name, username, email, role: role || 'student', programme, studentId };
            });

            const response = await fetch(`${API_URL}/api/users/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ users, defaultPassword })
            });
            const data = await response.json();
            if (response.ok) {
                setBulkResults(data);
                if (data.created > 0) fetchData();
            } else {
                setError(data.message || 'Failed to bulk add users');
            }
        } catch (error) {
            setError('Failed to parse or send data');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);
        try {
            const updatePayload = { ...editFormData };
            if (!updatePayload.password) delete (updatePayload as any).password;

            const response = await fetch(`${API_URL}/api/users/${selectedUser._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updatePayload)
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess('User updated successfully!');
                setTimeout(() => {
                    setIsEditModalOpen(false);
                    setSuccess(null);
                }, 1500);
                fetchData();
            } else {
                setError(data.message || 'Failed to update user');
            }
        } catch (error) {
            setError('Connection error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredBookings = bookings.filter(b =>
        (b.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.lab?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm font-medium"
                        >
                            <LayoutDashboard className="w-4 h-4 text-blue-400" />
                            Back to Dashboard
                        </button>
                        <h1 className="text-xl font-bold">Admin Management</h1>
                    </div>
                    <div className="flex bg-slate-700/50 p-1 rounded-xl flex-wrap gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === tab.id ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>
                    {activeTab === 'users' ? (
                        <button
                            onClick={() => {
                                setIsModalOpen(true);
                                setBulkResults(null);
                                setError(null);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
                        >
                            <UserPlus className="w-5 h-5" />
                            Add User
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
                        >
                            <Calendar className="w-5 h-5" />
                            Schedule Lab
                        </button>
                    )}
                </div>

                {error && !isModalOpen && !isEditModalOpen && !isExtendModalOpen && !isGradeModalOpen && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded-lg transition"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {success && !isModalOpen && !isEditModalOpen && !isExtendModalOpen && !isGradeModalOpen && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        {success}
                        <button onClick={() => setSuccess(null)} className="ml-auto p-1 hover:bg-emerald-500/20 rounded-lg transition"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : activeTab === 'users' ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">User</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Programme</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 font-medium">
                                {filteredUsers.map(user => (
                                    <tr key={user._id} className="hover:bg-slate-700/20 transition">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    {user.name}
                                                    <span className="text-[10px] text-slate-500 font-mono">@{user.username || 'n/a'}</span>
                                                </div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.programmes && user.programmes.length > 0 ? (
                                                    user.programmes.map(p => (
                                                        <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">
                                                            {p}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-slate-500 italic text-slate-500">N/A</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'enrolled' ? 'bg-green-500/20 text-green-400' : user.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setEditFormData({
                                                            name: user.name,
                                                            email: user.email,
                                                            username: user.username,
                                                            role: user.role,
                                                            password: '',
                                                            programmes: user.programmes || []
                                                        });
                                                        setIsEditModalOpen(true);
                                                        setError(null);
                                                        setSuccess(null);
                                                    }}
                                                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition border border-amber-500/20"
                                                    title="Edit User Details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {user.status === 'enrolled' ? (
                                                    <button
                                                        onClick={() => handleUpdateUserStatus(user._id, 'inactive')}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/20"
                                                        title="De-enroll"
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleUpdateUserStatus(user._id, 'enrolled')}
                                                        className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition border border-green-500/20"
                                                        title="Enroll"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleUpdateUserStatus(user._id, 'completed')}
                                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition border border-blue-500/20"
                                                    title="Mark Completed"
                                                >
                                                    <GraduationCap className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'bookings' ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">User & Lab</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Time</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 font-medium">
                                {filteredBookings.map(booking => (
                                    <tr key={booking._id} className="hover:bg-slate-700/20 transition">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold">{booking.user?.name || 'Unknown'}</div>
                                                <div className="text-xs text-blue-400">{booking.lab?.name || 'Unknown Lab'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            <div className="flex flex-col">
                                                <span>{new Date(booking.startTime).toLocaleDateString()}</span>
                                                <span className="text-xs">{new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {booking.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleUpdateBookingStatus(booking._id, 'confirmed')}
                                                        className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition border border-green-500/20 text-xs font-bold flex items-center gap-1.5"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Allow
                                                    </button>
                                                )}
                                                {booking.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleUpdateBookingStatus(booking._id, 'cancelled')}
                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/20 text-xs font-bold flex items-center gap-1.5"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Deny
                                                    </button>
                                                )}
                                                {booking.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBooking(booking);
                                                            const currentEnd = new Date(booking.endTime);
                                                            setExtensionTime(`${currentEnd.getHours().toString().padStart(2, '0')}:${currentEnd.getMinutes().toString().padStart(2, '0')}`);
                                                            setIsExtendModalOpen(true);
                                                            setError(null);
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition border border-blue-500/20 text-xs font-bold flex items-center gap-1.5"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Extend
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'analytics' ? (
                    <div className="space-y-6">
                        {/* Live Presence Banner */}
                        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                    <Activity className="w-7 h-7 text-emerald-400 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Students Present</h2>
                                    <p className="text-emerald-300 text-sm">Currently active in lab sessions</p>
                                </div>
                            </div>
                            <div className="text-5xl font-extrabold text-emerald-400">{activeStudents}</div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Total Submissions</span>
                                    <ClipboardList className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="text-3xl font-bold">{analytics?.totalSubmissions || 0}</div>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Pending Review</span>
                                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div className="text-3xl font-bold text-yellow-400">{analytics?.pendingSubmissions || 0}</div>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Graded</span>
                                    <Award className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="text-3xl font-bold text-green-400">{analytics?.gradedSubmissions || 0}</div>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Average Grade</span>
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="text-3xl font-bold text-purple-400">{analytics?.gradeStats?.averageGrade?.toFixed(1) || '—'}<span className="text-lg text-slate-500">/100</span></div>
                            </div>
                        </div>

                        {/* Lab Performance Breakdown */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" /> Lab Performance</h3>
                            <div className="space-y-4">
                                {analytics?.submissionsByLab?.map((lab) => (
                                    <div key={lab._id} className="flex items-center gap-4">
                                        <span className="text-sm text-slate-300 w-36">{lab._id}</span>
                                        <div className="flex-1 bg-slate-700/50 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min((lab.count / Math.max(analytics?.totalSubmissions || 1, 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-mono text-slate-400 w-16 text-right">{lab.count} sub</span>
                                        <span className="text-sm font-mono text-purple-400 w-20 text-right">Avg: {lab.avgGrade?.toFixed(1) || '—'}</span>
                                    </div>
                                )) || (
                                        <p className="text-slate-500 text-sm">No submission data yet. Once students submit their work, performance metrics will appear here.</p>
                                    )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400" /> Recent Activity (Last 7 Days)</h3>
                            <div className="flex items-end gap-2 h-40">
                                {analytics?.recentActivity?.length ? analytics.recentActivity.map((day) => (
                                    <div key={day._id} className="flex flex-col items-center flex-1">
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500"
                                            style={{ height: `${Math.max((day.count / Math.max(...analytics.recentActivity.map(d => d.count))) * 120, 8)}px` }}
                                        ></div>
                                        <span className="text-xs text-slate-400 mt-2">{new Date(day._id).toLocaleDateString('en', { weekday: 'short' })}</span>
                                        <span className="text-xs text-slate-500">{day.count}</span>
                                    </div>
                                )) : (
                                    <p className="text-slate-500 text-sm w-full text-center py-10">No activity in the last 7 days.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'submissions' ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Student</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Lab</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Submitted</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Grade</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 font-medium">
                                {submissions.length > 0 ? submissions.map(sub => (
                                    <tr key={sub._id} className="hover:bg-slate-700/20 transition">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold">{sub.student?.name || 'Unknown'}</div>
                                                <div className="text-xs text-slate-400">{(sub.student?.programmes && sub.student.programmes[0]) || sub.student?.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sub.lab?.type === 'AI' ? 'bg-purple-500/20 text-purple-400' :
                                                sub.lab?.type === 'Cybersecurity' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>{sub.lab?.name || 'Unknown'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(sub.submittedAt).toLocaleDateString()} <br />
                                            <span className="text-xs">{new Date(sub.submittedAt).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${sub.status === 'graded' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {sub.status === 'graded' ? '✓ Graded' : '⏳ Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {sub.grade !== undefined ? (
                                                <span className={`text-lg font-bold ${sub.grade >= 70 ? 'text-green-400' : sub.grade >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{sub.grade}/100</span>
                                            ) : (
                                                <span className="text-slate-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedSubmission(sub);
                                                    setGradeForm({ grade: sub.grade?.toString() || '', feedback: sub.feedback || '' });
                                                    setIsGradeModalOpen(true);
                                                }}
                                                className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition border border-purple-500/20 text-xs font-bold flex items-center gap-1.5"
                                            >
                                                <Star className="w-3.5 h-3.5" />
                                                {sub.status === 'graded' ? 'Re-grade' : 'Grade'}
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No submissions yet. Student submissions will appear here once they begin submitting work.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'provisioning' ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                        <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                Lab Provisioning Requests
                            </h2>
                            <div className="text-xs text-slate-400">
                                {bookings.filter(b => b.status === 'requested').length} active requests
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Student & Lab</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Time Window</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 font-medium">
                                {bookings.length > 0 ? bookings.map(booking => (
                                    <tr key={booking._id} className="hover:bg-slate-700/20 transition">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold">{booking.user?.name || 'Unknown'}</div>
                                                <div className="text-xs text-blue-400">{booking.lab?.name || 'Unknown Lab'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            <div className="flex flex-col">
                                                <span>{new Date(booking.startTime).toLocaleDateString()}</span>
                                                <span className="text-xs">{new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${booking.status === 'granted' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {booking.status === 'requested' ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedBookingForGrant(booking);
                                                        setGrantFormData({ provisionedUrl: '', adminNote: '' });
                                                        setIsGrantModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                    Provision Lab
                                                </button>
                                            ) : (
                                                <div className="text-xs text-slate-500 truncate max-w-[150px]" title={booking.provisionedUrl}>
                                                    Granted: {booking.provisionedUrl}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            No pending lab provisioning requests.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'feedback' ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <MessageSquare className="w-6 h-6 text-blue-400" />
                                User Feedback
                            </h2>
                            <button
                                onClick={handleExportFeedback}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>
                        {feedbacks.length > 0 ? (
                            feedbacks.filter(f => 
                                f.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                f.message.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map(feedback => (
                                <div key={feedback._id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-bold">
                                                {feedback.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold">{feedback.userName}</div>
                                                <div className="text-xs text-slate-500">{feedback.userEmail} &bull; {feedback.userRole}</div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded-md">
                                            {new Date(feedback.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded border border-purple-500/20">
                                                {feedback.category}
                                            </span>
                                            <h4 className="font-bold text-slate-200">{feedback.subject}</h4>
                                        </div>
                                        <p className="text-slate-400 text-sm leading-relaxed bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
                                            {feedback.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center text-slate-500 backdrop-blur-xl">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No feedback collected yet.</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'roles' ? (
                    <RoleManagement />
                ) : null}
            </main>

            {/* Edit User Modal */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-amber-500" />
                                Edit User Details
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 flex items-center gap-4 bg-slate-700/30 p-4 rounded-2xl border border-slate-600/50">
                                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">
                                    {selectedUser.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold">{selectedUser.name}</div>
                                    <div className="text-xs text-slate-400">{selectedUser.email}</div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    {success}
                                </div>
                            )}

                            <form onSubmit={handleUpdateUser} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={editFormData.name}
                                            onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={editFormData.email}
                                            onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Username</label>
                                        <input
                                            required
                                            type="text"
                                            value={editFormData.username}
                                            onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="New username"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                                        <select
                                            value={editFormData.role}
                                            onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {availableRoles.length > 0 ? (
                                                availableRoles.map(r => (
                                                    <option key={r.name} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="student">Student</option>
                                                    <option value="facilitator">Facilitator</option>
                                                    <option value="admin">Admin</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Enrolled Programmes</label>
                                    <div className="grid grid-cols-1 gap-2 bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl max-h-32 overflow-y-auto">
                                        {PROGRAMMES.map(p => (
                                            <label key={p} className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={editFormData.programmes.includes(p)}
                                                    onChange={e => {
                                                        const newProgrammes = e.target.checked
                                                            ? [...editFormData.programmes, p]
                                                            : editFormData.programmes.filter(item => item !== p);
                                                        setEditFormData({ ...editFormData, programmes: newProgrammes });
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-800"
                                                />
                                                <span className="text-sm text-slate-300 group-hover:text-white transition">{p}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">New Password</label>
                                    <input
                                        type="password"
                                        value={editFormData.password}
                                        onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-blue-400 font-mono"
                                        placeholder="Empty to keep current"
                                    />
                                    <p className="text-[10px] text-slate-500 italic">Leave blank to keep the current password.</p>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                                        ) : (
                                            <>
                                                <ShieldCheck className="w-5 h-5" />
                                                Update User
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold">Add New User</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex bg-slate-700/30 p-1 mx-6 mt-6 rounded-xl">
                            <button
                                onClick={() => setModalMode('single')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${modalMode === 'single' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
                            >
                                <FileText className="w-4 h-4" />
                                Single User
                            </button>
                            <button
                                onClick={() => setModalMode('bulk')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${modalMode === 'bulk' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
                            >
                                <UploadCloud className="w-4 h-4" />
                                Bulk Import
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {error && (
                                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {bulkResults && (
                                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl text-sm">
                                    <div className="font-bold text-blue-400 mb-2">Import Results:</div>
                                    <div className="flex gap-4 mb-2">
                                        <span className="text-green-400">Created: {bulkResults.created}</span>
                                        <span className="text-red-400">Failed: {bulkResults.failed}</span>
                                    </div>
                                    {bulkResults.errors.length > 0 && (
                                        <div className="max-h-24 overflow-y-auto text-xs text-slate-400 border-t border-blue-500/20 pt-2 mt-2">
                                            {bulkResults.errors.map((err, i) => <div key={i}>{err}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {modalMode === 'single' ? (
                                <form id="singleUserForm" onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Username</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="jdoe"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {availableRoles.length > 0 ? (
                                                availableRoles.map(r => (
                                                    <option key={r.name} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="student">Student</option>
                                                    <option value="facilitator">Facilitator</option>
                                                    <option value="admin">Admin</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Password (Optional)</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Default: Welcome123"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Enrolled Programmes</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl">
                                            {PROGRAMMES.map(p => (
                                                <label key={p} className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.programmes.includes(p)}
                                                        onChange={e => {
                                                            const newProgrammes = e.target.checked
                                                                ? [...formData.programmes, p]
                                                                : formData.programmes.filter(item => item !== p);
                                                            setFormData({ ...formData, programmes: newProgrammes });
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-800"
                                                    />
                                                    <span className="text-sm text-slate-300 group-hover:text-white transition">{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Student ID / Service Number</label>
                                        <input
                                            type="text"
                                            value={formData.studentId}
                                            onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="NOU123456789"
                                        />
                                    </div>
                                </form>
                            ) : (
                                <form id="bulkUserForm" onSubmit={handleBulkAddUser} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Default Password</label>
                                        <input
                                            type="text"
                                            value={defaultPassword}
                                            onChange={e => setDefaultPassword(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 text-slate-400 text-xs flex gap-2">
                                        <AlertCircle className="w-4 h-4 text-blue-400" />
                                        <span>Use these exact programme names in CSV:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {PROGRAMMES.map(p => (
                                            <span key={p} className="px-2 py-1 bg-slate-700/50 rounded border border-slate-600 text-[10px]">{p}</span>
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Bulk Data (CSV format)</label>
                                        <textarea
                                            required
                                            rows={8}
                                            value={bulkData}
                                            onChange={e => setBulkData(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                            placeholder="name, username, email, role, programme, studentId"
                                        ></textarea>
                                        <p className="text-[10px] text-slate-500">Format: Name, Username, Email, [Role], [Programme], [ID]</p>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-700 flex gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                form={modalMode === 'single' ? "singleUserForm" : "bulkUserForm"}
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5" />
                                        {modalMode === 'single' ? 'Create User' : 'Start Import'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Time Extension Modal */}
            {isExtendModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsExtendModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                Extend Lab Time
                            </h2>
                            <button onClick={() => setIsExtendModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 bg-slate-700/30 p-4 rounded-2xl border border-slate-600/50">
                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Current Schedule</div>
                                <div className="text-sm font-medium text-white">
                                    {new Date(selectedBooking.startTime).toLocaleTimeString()} - {new Date(selectedBooking.endTime).toLocaleTimeString()}
                                </div>
                                <div className="text-xs text-blue-400 mt-1">{selectedBooking.lab?.name}</div>
                            </div>

                            {error && (
                                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleExtendBooking} className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleQuickExtend(15)}
                                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition"
                                        >
                                            +15m
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickExtend(30)}
                                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition"
                                        >
                                            +30m
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickExtend(60)}
                                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition"
                                        >
                                            +1h
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Adjust End Time</label>
                                        <input
                                            required
                                            type="time"
                                            value={extensionTime}
                                            onChange={e => setExtensionTime(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white text-lg font-bold"
                                        />
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
                                        <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Proposed End</div>
                                        <div className="text-lg font-black text-blue-400">
                                            {(() => {
                                                const [h, m] = extensionTime.split(':');
                                                if (!h || !m) return '--:--';
                                                const prop = new Date(selectedBooking.endTime);
                                                prop.setHours(parseInt(h), parseInt(m), 0, 0);
                                                if (prop <= new Date(selectedBooking.endTime)) {
                                                    prop.setDate(prop.getDate() + 1);
                                                }
                                                return prop.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsExtendModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Update Time
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Grade Submission Modal */}
            {isGradeModalOpen && selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsGradeModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Star className="w-5 h-5 text-purple-500" />
                                Grade Submission
                            </h2>
                            <button onClick={() => setIsGradeModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 flex items-center gap-4 bg-slate-700/30 p-4 rounded-2xl border border-slate-600/50">
                                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center font-bold text-xl">
                                    {selectedSubmission.student?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div className="font-bold">{selectedSubmission.student?.name}</div>
                                    <div className="text-xs text-slate-400">{selectedSubmission.lab?.name} &bull; {new Date(selectedSubmission.submittedAt).toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Grade (0-100)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Enter grade..."
                                        value={gradeForm.grade}
                                        onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 outline-none transition text-lg font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Feedback</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Provide constructive feedback for the student..."
                                        value={gradeForm.feedback}
                                        onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 outline-none transition resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setIsGradeModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGradeSubmission}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl transition font-bold flex items-center justify-center gap-2"
                                >
                                    <Award className="w-4 h-4" />
                                    Post Result
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grant Lab Modal */}
            {isGrantModalOpen && selectedBookingForGrant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsGrantModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                Provision Lab Instance
                            </h2>
                            <button onClick={() => setIsGrantModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 bg-slate-700/30 p-4 rounded-2xl border border-slate-600/50">
                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Requesting Student</div>
                                <div className="text-sm font-bold text-white">{selectedBookingForGrant.user?.name}</div>
                                <div className="text-xs text-emerald-400 mt-1">{selectedBookingForGrant.lab?.name}</div>
                            </div>

                            <form onSubmit={handleGrantLab} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Provisioned Lab URL</label>
                                    <input
                                        required
                                        type="url"
                                        value={grantFormData.provisionedUrl}
                                        onChange={e => setGrantFormData({ ...grantFormData, provisionedUrl: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="https://aws-provisioned-lab-url.com/..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Admin Note (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={grantFormData.adminNote}
                                        onChange={e => setGrantFormData({ ...grantFormData, adminNote: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                        placeholder="Add instructions for the student..."
                                    />
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsGrantModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Grant Access
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && <SystemSettings />}
        </div>
    );
};

export default AdminManagement;
