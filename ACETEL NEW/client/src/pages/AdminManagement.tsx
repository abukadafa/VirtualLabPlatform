import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SystemSettings from '../components/SystemSettings';
import ManageFacilitators from '../components/ManageFacilitators';
import MonitoringDashboard from '../components/MonitoringDashboard';
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
    Clock,
    BarChart3,
    ClipboardList,
    Award,
    TrendingUp,
    Activity,
    Star,
    Trash2,
    Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const PROGRAMMES = [
    'Artificial Intelligence',
    'Cybersecurity',
    'Management Information System'
];

const AdminManagement: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'analytics' | 'submissions' | 'settings' | 'facilitators' | 'monitoring'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Add User Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'single' | 'bulk'>('single');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bulkResults, setBulkResults] = useState<{ created: number, failed: number, errors: string[] } | null>(null);

    // Edit Credentials Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState({
        username: '',
        password: '',
        programmes: [] as string[]
    });

    // Extension Modal State
    const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    // Submissions & Analytics State
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
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

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
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
            }
        } catch (error) {
            console.error(`Failed to fetch ${activeTab}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleGradeSubmission = async () => {
        if (!selectedSubmission || !token) return;
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
                setIsGradeModalOpen(false);
                setGradeForm({ grade: '', feedback: '' });
                fetchData(); // Re-fetch data to update submission status
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to grade submission');
            }
        } catch (error) {
            console.error('Failed to grade submission:', error);
            setError('Connection error');
        }
    };

    const activeStudents = bookings.filter(b => b.status === 'confirmed').length;

    const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) fetchData();
        } catch (error) {
            console.error('Failed to update user status:', error);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                fetchData();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('An error occurred while deleting the user');
        }
    };

    const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
        try {
            const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) fetchData();
        } catch (error) {
            console.error('Failed to update booking status:', error);
        }
    };

    const handleDeleteBooking = async (bookingId: string) => {
        if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return;

        try {
            const url = `${API_URL}/api/bookings/${bookingId}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchData();
                alert('Booking deleted successfully!');
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete booking' }));
                console.error('Delete failed with error:', errorData);
                setError(errorData.message || 'Failed to delete booking');
                alert(`Error: ${errorData.message || 'Failed to delete booking'}`);
            }
        } catch (error) {
            console.error('Failed to delete booking:', error);
            const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
            setError(errorMessage);
            alert(`Error: ${errorMessage}`);
        }
    };

    const handleExtendBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBooking) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const [hours, minutes] = extensionTime.split(':');
            const newEnd = new Date(selectedBooking.endTime);
            newEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // If the selected time is earlier than or equal to current end time, 
            // assume it's for the next day (common for sessions spanning midnight)
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
                setIsExtendModalOpen(false);
                fetchData();
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

    const handleResetCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/users/${selectedUser._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editFormData)
            });
            const data = await response.json();
            if (response.ok) {
                setIsEditModalOpen(false);
                setEditFormData({ username: '', password: '', programmes: [PROGRAMMES[0]] });
                fetchData();
            } else {
                setError(data.message || 'Failed to update credentials');
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
        <div className="min-h-screen bg-[#f8fafc] text-slate-900">
            <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }} className="sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition"
                        >
                            <LayoutDashboard className="w-5 h-5 text-[#1e3a8a]" />
                        </button>
                        <div>
                            <div className="text-[10px] font-bold text-[#008751] uppercase tracking-wider">ACETEL SDMS</div>
                            <h1 className="text-lg font-extrabold text-[#1e3a8a] leading-tight">Admin Management</h1>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1 border border-slate-200">
                        {(['users', 'bookings', 'submissions', 'analytics', 'facilitators', 'monitoring', 'settings'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeTab === tab ? 'bg-[#1e3a8a] text-white shadow-md' : 'hover:bg-slate-200 text-[#1e3a8a]'}`}
                            >
                                {tab === 'users' && <Users className="w-3.5 h-3.5" />}
                                {tab === 'bookings' && <Calendar className="w-3.5 h-3.5" />}
                                {tab === 'submissions' && <ClipboardList className="w-3.5 h-3.5" />}
                                {tab === 'analytics' && <BarChart3 className="w-3.5 h-3.5" />}
                                {tab === 'facilitators' && <ShieldCheck className="w-3.5 h-3.5" />}
                                {tab === 'monitoring' && <Activity className="w-3.5 h-3.5" />}
                                {tab === 'settings' && <SettingsIcon className="w-3.5 h-3.5" />}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                                                            username: user.username,
                                                            password: '',
                                                            programmes: user.programmes || []
                                                        });
                                                        setIsEditModalOpen(true);
                                                        setError(null);
                                                    }}
                                                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition border border-amber-500/20"
                                                    title="Reset Credentials"
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
                                                <button
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition border border-red-600/20"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
                                                <button
                                                    onClick={() => handleDeleteBooking(booking._id)}
                                                    className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition border border-orange-500/20 text-xs font-bold flex items-center gap-1.5"
                                                    title="Delete Booking"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
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
                ) : activeTab === 'facilitators' ? (
                    <ManageFacilitators />
                ) : activeTab === 'monitoring' ? (
                    <MonitoringDashboard />
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

                            <form onSubmit={handleResetCredentials} className="space-y-4">
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
                                            <option value="student">Student</option>
                                            <option value="facilitator">Facilitator</option>
                                            <option value="admin">Admin</option>
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

            {/* Settings Tab */}
            {activeTab === 'settings' && <SystemSettings />}
        </div>
    );
};

export default AdminManagement;
