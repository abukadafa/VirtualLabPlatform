import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LogOut,
    Cpu,
    Shield,
    Database,
    Calendar,
    Clock,
    Users,
    Settings,
    BookOpen,
    X,
    CheckCircle,
    AlertCircle,
    Loader2,
    Award,
    MessageSquare,
    FileCheck,
    Info,
    Play
} from 'lucide-react';
import { API_URL } from '../lib/config';

interface Lab {
    _id: string;
    name: string;
    type: 'AI' | 'Cybersecurity' | 'MIS';
    description: string;
    software: string[];
    capacity: number;
    status: string;
}

interface Booking {
    _id: string;
    lab: { _id: string; name: string; type: string };
    startTime: string;
    endTime: string;
    status: string;
    purpose?: string;
    adminNote?: string;
    provisionedUrl?: string;
}

interface GradedResult {
    _id: string;
    lab: { _id: string; name: string; type: string };
    submittedAt: string;
    grade: number;
    feedback?: string;
    status: string;
}

const Dashboard: React.FC = () => {
    const { user, logout, token, branding } = useAuth();
    const navigate = useNavigate();
    const [labs, setLabs] = useState<Lab[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingSubmissions, setPendingSubmissions] = useState(0);
    const [selectedProgramme, setSelectedProgramme] = useState<string | null>(
        user?.programmes && user.programmes.length > 0 ? user.programmes[0] : null
    );

    // ... inside return ...
    // Search for <header ...>


    // Booking Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedLabForBooking, setSelectedLabForBooking] = useState<Lab | null>(null);
    const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [results, setResults] = useState<GradedResult[]>([]);
    const [bookingData, setBookingData] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '11:00',
        purpose: ''
    });

    // Feedback Modal State
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [feedbackData, setFeedbackData] = useState({
        subject: '',
        category: 'General',
        message: ''
    });

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsFeedbackSubmitting(true);
        setFeedbackStatus(null);

        try {
            const response = await fetch(`${API_URL}/api/users/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(feedbackData)
            });

            if (response.ok) {
                setFeedbackStatus({ type: 'success', message: 'Feedback submitted! Thank you.' });
                setFeedbackData({ subject: '', category: 'General', message: '' });
                setTimeout(() => setIsFeedbackModalOpen(false), 2000);
            } else {
                const data = await response.json();
                setFeedbackStatus({ type: 'error', message: data.message || 'Failed to submit feedback' });
            }
        } catch (error) {
            setFeedbackStatus({ type: 'error', message: 'Connection error' });
        } finally {
            setIsFeedbackSubmitting(false);
        }
    };

    useEffect(() => {
        fetchLabs();
        fetchBookings();
        fetchResults();
        if (user?.role === 'facilitator' || user?.role === 'admin') {
            fetchPendingSubmissions();
        }
    }, []);

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLabForBooking) return;

        setIsBookingSubmitting(true);
        setBookingError(null);

        try {
            const startDateTime = new Date(`${bookingData.date}T${bookingData.startTime}`);
            const endDateTime = new Date(`${bookingData.date}T${bookingData.endTime}`);

            if (endDateTime <= startDateTime) {
                setBookingError('End time must be after start time');
                setIsBookingSubmitting(false);
                return;
            }

            const response = await fetch(`${API_URL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    lab: selectedLabForBooking._id,
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    purpose: bookingData.purpose
                })
            });

            const data = await response.json();

            if (response.ok) {
                setIsBookingModalOpen(false);
                setBookingData({
                    date: new Date().toISOString().split('T')[0],
                    startTime: '09:00',
                    endTime: '11:00',
                    purpose: ''
                });
                fetchBookings(); // Refresh list
            } else {
                setBookingError(data.message || 'Failed to create booking');
            }
        } catch (error) {
            setBookingError('Connection error. Please try again.');
        } finally {
            setIsBookingSubmitting(false);
        }
    };

    const handleRequestLab = async (bookingId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/bookings/${bookingId}/request-instance`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchBookings(); // Refresh bookings to show new status
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to request lab access');
            }
        } catch (error) {
            console.error('Failed to request lab:', error);
        }
    };

    const fetchLabs = async () => {
        try {
            const response = await fetch(`${API_URL}/api/labs`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setLabs(data);
            }
        } catch (error) {
            console.error('Failed to fetch labs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            const response = await fetch(`${API_URL}/api/bookings/my-bookings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setBookings(data);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        }
    };

    const fetchResults = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_URL}/api/submissions/my-results`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setResults(await response.json());
            }
        } catch (error) {
            console.error('Failed to fetch results:', error);
        }
    };

    const fetchPendingSubmissions = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_URL}/api/submissions/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPendingSubmissions(data.pendingSubmissions || 0);
            }
        } catch (error) {
            console.error('Failed to fetch pending submissions:', error);
        }
    };

    const getLabIcon = (type: string) => {
        switch (type) {
            case 'AI':
                return <Cpu className="w-6 h-6" />;
            case 'Cybersecurity':
                return <Shield className="w-6 h-6" />;
            case 'MIS':
                return <Database className="w-6 h-6" />;
            default:
                return <BookOpen className="w-6 h-6" />;
        }
    };

    const getProgrammeType = (programme: string): 'AI' | 'Cybersecurity' | 'MIS' => {
        if (programme === 'Artificial Intelligence') return 'AI';
        if (programme === 'Cybersecurity') return 'Cybersecurity';
        return 'MIS';
    };

    const getLabGradient = (type: string) => {
        switch (type) {
            case 'AI':
                return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
            case 'Cybersecurity':
                return 'from-red-500/20 to-orange-500/20 border-red-500/30';
            case 'MIS':
                return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
            default:
                return 'from-slate-500/20 to-gray-500/20 border-slate-500/30';
        }
        return 'from-slate-500/20 to-gray-500/20 border-slate-500/30';
    }


    // Filter labs based on user's programmes and active status
    const filteredLabs = labs.filter((lab) => {
        // For students: match selected programme and only show active labs
        if (user?.role === 'student') {
            const programmeMatch = selectedProgramme
                ? lab.type === getProgrammeType(selectedProgramme)
                : false;
            return programmeMatch && lab.status === 'active';
        }

        // For facilitators and admins: show all labs
        if (user?.role === 'facilitator' || user?.role === 'admin') {
            return true;
        }

        // For admin: show all labs
        return true;
    });

    // Filter bookings - students only see confirmed/active bookings
    const displayBookings = user?.role === 'student'
        ? bookings.filter(b => ['confirmed', 'requested', 'granted', 'active', 'completed'].includes(b.status))
        : bookings;

    // Helper to check permissions
    const hasPerm = (perm: string) => {
        if (user?.role === 'admin') return true;
        return user?.permissions?.includes(perm) || false;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {branding?.logoUrl ? (
                                <img src={branding.logoUrl} alt={branding.appName} className="h-10 object-contain" />
                            ) : (
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Cpu className="w-6 h-6 text-blue-400" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-white">{branding?.appName || 'Virtual Lab Platform'}</h1>
                                <p className="text-slate-400 text-sm">
                                    Welcome back, <span className="text-white font-medium">{user?.name}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                                {user?.role}
                            </span>
                            {hasPerm('view_submissions') && (
                                <button
                                    onClick={() => navigate('/facilitator/submissions')}
                                    className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-white rounded-lg transition shadow-lg shadow-secondary/20"
                                >
                                    <FileCheck className="w-4 h-4" />
                                    Submissions
                                </button>
                            )}
                            {hasPerm('manage_users') || hasPerm('manage_labs') || hasPerm('provision_labs') || hasPerm('manage_roles') || hasPerm('view_feedback') || hasPerm('view_analytics') || hasPerm('view_submissions') ? (
                                <button
                                    onClick={() => navigate('/admin/management')}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition shadow-lg shadow-primary/20"
                                >
                                    <Settings className="w-4 h-4" />
                                    Manage
                                </button>
                            ) : null}
                            <button
                                onClick={() => (hasPerm('view_feedback') && user?.role !== 'student') ? navigate('/admin/management', { state: { activeTab: 'feedback' } }) : setIsFeedbackModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
                                <MessageSquare className="w-4 h-4" />
                                Feedback
                            </button>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-lg">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Available Labs</p>
                                <p className="text-2xl font-bold text-white">{labs.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-lg">
                                <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">My Bookings</p>
                                <p className="text-2xl font-bold text-white">{bookings.length}</p>
                            </div>
                        </div>
                    </div>
                    {(user?.role === 'facilitator' || user?.role === 'admin') ? (
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-secondary/20 rounded-lg">
                                    <FileCheck className="w-6 h-6 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Pending Reviews</p>
                                    <p className="text-2xl font-bold text-white">{pendingSubmissions}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-lg">
                                    <Clock className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Active Sessions</p>
                                    <p className="text-2xl font-bold text-white">
                                        {bookings.filter((b) => b.status === 'active').length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                {/* Programme Selector - Students Only */}
                {
                    user?.role === 'student' && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-white mb-4">Select Your Programme</h2>
                            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['Artificial Intelligence', 'Cybersecurity', 'Management Information System'].map((prog) => (
                                        <label
                                            key={prog}
                                            className={`cursor-pointer transition-all ${selectedProgramme === prog ? 'ring-2 ring-primary rounded-xl transform scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="programme"
                                                className="sr-only"
                                                checked={selectedProgramme === prog}
                                                onChange={() => setSelectedProgramme(prog)}
                                            />
                                            <div className={`
                                            h-full rounded-xl p-6 border flex flex-col items-center justify-center text-center gap-3
                                            ${prog === 'Artificial Intelligence' ? 'bg-gradient-to-br from-primary/20 to-cyan-500/20 border-primary/30' : ''}
                                            ${prog === 'Cybersecurity' ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30' : ''}
                                            ${prog === 'Management Information System' ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30' : ''}
                                        `}>
                                                {prog === 'Artificial Intelligence' && <Cpu className="w-8 h-8 text-primary" />}
                                                {prog === 'Cybersecurity' && <Shield className="w-8 h-8 text-red-400" />}
                                                {prog === 'Management Information System' && <Database className="w-8 h-8 text-green-400" />}
                                                <h3 className="font-bold text-white text-sm">{prog}</h3>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Programme Display - Facilitators Only */}
                {
                    user?.role === 'facilitator' && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-white mb-4">Your Assigned Programmes</h2>
                            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                                <div className="flex flex-wrap gap-4">
                                    {user.programmes?.map((prog) => (
                                        <div
                                            key={prog}
                                            className={`
                                            px-6 py-4 rounded-xl border flex items-center gap-3 transition-all
                                            ${prog === 'Artificial Intelligence' ? 'bg-blue-500/10 border-blue-500/30' : ''}
                                            ${prog === 'Cybersecurity' ? 'bg-red-500/10 border-red-500/30' : ''}
                                            ${prog === 'Management Information System' ? 'bg-green-500/10 border-green-500/30' : ''}
                                        `}>
                                            {prog === 'Artificial Intelligence' && <Cpu className="w-6 h-6 text-blue-400" />}
                                            {prog === 'Cybersecurity' && <Shield className="w-6 h-6 text-red-400" />}
                                            {prog === 'Management Information System' && <Database className="w-6 h-6 text-green-400" />}
                                            <span className="font-bold text-white uppercase tracking-wider text-xs">{prog}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm italic">
                                    <Info className="w-4 h-4" />
                                    <span>You are restricted to labs and submissions within these assigned programmes.</span>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Labs Section */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h2 className="text-xl font-bold text-white">Available Virtual Labs</h2>
                        {user?.role === 'facilitator' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-semibold text-blue-400">BOOKING REQUIRED FOR ACCESS</span>
                            </div>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="text-center text-slate-400 py-12">Loading labs...</div>
                    ) : filteredLabs.length === 0 ? (
                        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700/50 text-center">
                            <p className="text-slate-400">
                                {user?.role === 'student' && !selectedProgramme
                                    ? "Please select a programme to view available labs."
                                    : "No labs available matching your criteria."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLabs.map((lab) => {
                                const hasActiveBooking = bookings.some(b =>
                                    b.lab._id === lab._id &&
                                    ['confirmed', 'requested', 'granted', 'active'].includes(b.status)
                                );
                                
                                const isFacilitatorInProgramme = user?.role === 'facilitator' && 
                                    user.programmes?.some(p => getProgrammeType(p) === lab.type);

                                const canLaunch = user?.role === 'admin' || hasActiveBooking || isFacilitatorInProgramme;

                                return (
                                    <div
                                        key={lab._id}
                                        className={`bg-gradient-to-br ${getLabGradient(
                                            lab.type
                                        )} backdrop-blur-xl rounded-xl p-6 border hover:scale-[1.02] transition-all flex flex-col`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-white/10 rounded-lg">{getLabIcon(lab.type)}</div>
                                            <span className="px-2 py-1 bg-white/10 rounded text-xs font-medium text-white">
                                                {lab.type}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{lab.name}</h3>
                                        <p className="text-slate-300 text-sm mb-4 flex-1">{lab.description}</p>
                                        <div className="flex items-center gap-2 text-sm mb-4">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-400">Capacity: {lab.capacity}</span>
                                        </div>
                                        <div className="mt-auto">
                                            {canLaunch ? (
                                                (() => {
                                                    const relevantBooking = bookings.find(b => 
                                                        b.lab._id === lab._id && 
                                                        ['confirmed', 'requested', 'granted', 'active'].includes(b.status)
                                                    );

                                                    // Admin or user with granted/active session
                                                    if (user?.role === 'admin' || (relevantBooking && (relevantBooking.status === 'granted' || relevantBooking.status === 'active'))) {
                                                        return (
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        if (relevantBooking?.provisionedUrl) {
                                                                            window.open(relevantBooking.provisionedUrl, '_blank');
                                                                        } else {
                                                                            navigate(`/lab/${lab._id}`);
                                                                        }
                                                                    }}
                                                                    className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition text-center flex items-center justify-center gap-2"
                                                                >
                                                                    <Cpu className="w-4 h-4" />
                                                                    Launch Lab
                                                                </button>
                                                                {user?.role !== 'admin' && hasPerm('submit_assignments') && (relevantBooking?.status === 'confirmed' || relevantBooking?.status === 'requested' || relevantBooking?.status === 'granted' || relevantBooking?.status === 'active') && (
                                                                    <button
                                                                        onClick={() => window.open('https://elearn.nou.edu.ng/login/index.php', '_blank')}
                                                                        className="w-full px-4 py-3 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg text-sm font-bold transition text-center flex items-center justify-center gap-2 border border-secondary/30"
                                                                    >
                                                                        <FileCheck className="w-4 h-4" />
                                                                        Submit Lab Task
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    } else if (relevantBooking && relevantBooking.status === 'requested') {
                                                        return (
                                                            <div className="w-full px-4 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2">
                                                                <Clock className="w-4 h-4" />
                                                                Access Requested
                                                            </div>
                                                        );
                                                    } else if (relevantBooking && relevantBooking.status === 'confirmed') {
                                                        if (hasPerm('request_lab_instance')) {
                                                            return (
                                                                <button
                                                                    onClick={() => handleRequestLab(relevantBooking._id)}
                                                                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-emerald-500/20 text-center flex items-center justify-center gap-2"
                                                                >
                                                                    <Play className="w-4 h-4" />
                                                                    Request Lab Access
                                                                </button>
                                                            );
                                                        } else {
                                                            return (
                                                                <div className="w-full px-4 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2">
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    Booking Confirmed
                                                                </div>
                                                            );
                                                        }
                                                    } else if (hasPerm('view_labs')) {
                                                        return (
                                                            <button
                                                                onClick={() => navigate(`/lab/${lab._id}`)}
                                                                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition text-center flex items-center justify-center gap-2"
                                                            >
                                                                <Cpu className="w-4 h-4" />
                                                                Launch Lab
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()
                                            ) : (
                                                hasPerm('book_labs') && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLabForBooking(lab);
                                                            setIsBookingModalOpen(true);
                                                            setBookingError(null);
                                                        }}
                                                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-blue-500/20 text-center flex items-center justify-center gap-2"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                        Book Session
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                        </div>
                    )}
                </div>

                {/* Recent Bookings */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4">My Recent Bookings</h2>
                    {displayBookings.length === 0 ? (
                        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700/50 text-center">
                            <p className="text-slate-400">No bookings yet. Click on a lab to get started!</p>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                                Lab
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                                Start Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                                End Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {displayBookings.slice(0, 5).map((booking) => (
                                            <tr key={booking._id} className="hover:bg-slate-700/20">
                                                <td className="px-6 py-4 text-sm text-white">{booking.lab.name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    {new Date(booking.startTime).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    {new Date(booking.endTime).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'granted' || booking.status === 'active'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : booking.status === 'requested'
                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                : booking.status === 'confirmed'
                                                                    ? 'bg-blue-500/20 text-blue-400'
                                                                    : 'bg-slate-500/20 text-slate-400'
                                                            }`}
                                                    >
                                                        {booking.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {booking.status === 'granted' || booking.status === 'active' ? (
                                                        <button 
                                                            onClick={() => navigate(`/lab/${booking.lab._id}`)}
                                                            className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                            Launch
                                                        </button>
                                                    ) : booking.status === 'confirmed' ? (
                                                        <button 
                                                            onClick={() => handleRequestLab(booking._id)}
                                                            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                            Request
                                                        </button>
                                                    ) : booking.status === 'requested' ? (
                                                        <span className="text-amber-400/50 flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            Pending
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 italic">No action</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Grades & Feedback */}
                {
                    results.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Award className="w-5 h-5 text-purple-400" />
                                My Grades & Feedback
                            </h2>
                            <div className="space-y-3">
                                {results.map(result => (
                                    <div key={result._id} className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${result.grade >= 70 ? 'bg-green-500/20 text-green-400' :
                                                result.grade >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {result.grade}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{result.lab?.name}</div>
                                                <div className="text-xs text-slate-400">Submitted {new Date(result.submittedAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {result.feedback && (
                                                <div className="max-w-xs text-sm text-slate-300 bg-slate-700/30 px-4 py-2 rounded-xl border border-slate-600/30">
                                                    <MessageSquare className="w-3 h-3 inline mr-1 text-purple-400" />
                                                    {result.feedback}
                                                </div>
                                            )}
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.grade >= 70 ? 'bg-green-500/20 text-green-400' :
                                                result.grade >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {result.grade >= 70 ? 'Excellent' : result.grade >= 50 ? 'Pass' : 'Needs Improvement'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
            </main >

            {/* Booking Modal */}
            {
                isBookingModalOpen && selectedLabForBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsBookingModalOpen(false)}
                        ></div>
                        <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-slate-700">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                        Book {selectedLabForBooking.name}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">{selectedLabForBooking.type} Laboratory</p>
                                </div>
                                <button
                                    onClick={() => setIsBookingModalOpen(false)}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                                {bookingError && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {bookingError}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
                                        <input
                                            required
                                            type="date"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={bookingData.date}
                                            onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Purpose</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Assignment 1"
                                            value={bookingData.purpose}
                                            onChange={e => setBookingData({ ...bookingData, purpose: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Start Time</label>
                                        <input
                                            required
                                            type="time"
                                            value={bookingData.startTime}
                                            onChange={e => setBookingData({ ...bookingData, startTime: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">End Time</label>
                                        <input
                                            required
                                            type="time"
                                            value={bookingData.endTime}
                                            onChange={e => setBookingData({ ...bookingData, endTime: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-700/30 rounded-2xl border border-slate-600/50 flex gap-3 text-xs text-slate-400">
                                    <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    <p>Bookings are automatically confirmed if capacity allows. If the lab is full, your request will be sent for admin review.</p>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsBookingModalOpen(false)}
                                        className="flex-1 px-4 py-3 border border-slate-700 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isBookingSubmitting}
                                        className="flex-1 px-4 py-3 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white rounded-xl font-bold transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                    >
                                        {isBookingSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Confirm Booking
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Feedback Modal */}
            {isFeedbackModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => setIsFeedbackModalOpen(false)}
                    ></div>
                    <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <MessageSquare className="w-5 h-5 text-blue-500" />
                                    Send Feedback
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">We value your input to improve the platform</p>
                            </div>
                            <button
                                onClick={() => setIsFeedbackModalOpen(false)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
                            {feedbackStatus && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${feedbackStatus.type === 'success' ? 'bg-green-500/10 border border-green-500/50 text-green-400' : 'bg-red-500/10 border border-red-500/50 text-red-400'
                                    }`}>
                                    {feedbackStatus.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    {feedbackStatus.message}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                                    <select
                                        value={feedbackData.category}
                                        onChange={e => setFeedbackData({ ...feedbackData, category: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                    >
                                        <option value="General">General</option>
                                        <option value="Technical Issue">Technical Issue</option>
                                        <option value="Feature Request">Feature Request</option>
                                        <option value="Content">Content</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Subject</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Brief summary"
                                        value={feedbackData.subject}
                                        onChange={e => setFeedbackData({ ...feedbackData, subject: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Tell us what you think..."
                                    value={feedbackData.message}
                                    onChange={e => setFeedbackData({ ...feedbackData, message: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsFeedbackModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-slate-700 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isFeedbackSubmitting}
                                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white rounded-xl font-bold transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {isFeedbackSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5" />
                                            Submit Feedback
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
