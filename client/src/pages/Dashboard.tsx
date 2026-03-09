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
    AlertCircle,
    Loader2,
    Award,
    MessageSquare,
    FileCheck,
    Play,
    ShieldCheck
} from 'lucide-react';
import { API_URL, AWS_LAUNCH_URL, NOUN_ELEARN_URL } from '../lib/config';

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

    useEffect(() => {
        if (user?.programmes && user.programmes.length > 0 && !selectedProgramme) {
            setSelectedProgramme(user.programmes[0]);
        }
    }, [user, selectedProgramme]);


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
            console.log('Submitting feedback to:', `${API_URL}/api/users/feedback`);
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
                console.error('Feedback error data:', data);
                setFeedbackStatus({ type: 'error', message: data.message || 'Failed to submit feedback' });
            }
        } catch (error: any) {
            console.error('Feedback fetch error:', error);
            setFeedbackStatus({ type: 'error', message: 'Connection error: ' + error.message });
        } finally {
            setIsFeedbackSubmitting(false);
        }
    };

    useEffect(() => {
        fetchLabs();
        fetchBookings();
        fetchResults();
        if (user?.role === 'facilitator' || user?.role === 'admin' || user?.role === 'lab technician') {
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
                return <Cpu className="w-6 h-6 text-green-600" />;
            case 'Cybersecurity':
                return <Shield className="w-6 h-6 text-green-600" />;
            case 'MIS':
                return <Database className="w-6 h-6 text-green-600" />;
            default:
                return <BookOpen className="w-6 h-6 text-green-600" />;
        }
    };

    const getProgrammeType = (programme: string): 'AI' | 'Cybersecurity' | 'MIS' => {
        if (programme === 'Artificial Intelligence') return 'AI';
        if (programme === 'Cybersecurity') return 'Cybersecurity';
        return 'MIS';
    };


    // Filter labs based on user's programmes and active status
    const filteredLabs = labs.filter((lab) => {
        // For students: match selected programme and only show active labs
        if (user?.role === 'student') {
            const programmeMatch = selectedProgramme
                ? lab.type === getProgrammeType(selectedProgramme)
                : false;
            return programmeMatch && lab.status === 'active';
        }

        // For facilitators, technicians and admins: show all labs
        return true;
    });

    // Helper to check permissions
    const hasPerm = (perm: string) => {
        if (user?.role === 'admin') return true;
        return user?.permissions?.includes(perm) || false;
    };

    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {branding?.logoUrl ? (
                                <img src={branding.logoUrl} alt={branding.appName} className="h-10 object-contain" />
                            ) : (
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <ShieldCheck className="w-6 h-6 text-green-600" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-black text-slate-900">{branding?.appName || 'Virtual Lab Platform'}</h1>
                                <p className="text-slate-500 text-xs font-bold">
                                    Welcome back, <span className="text-green-600">{user?.name}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">
                                {user?.role}
                            </span>
                            {hasPerm('view_submissions') && (
                                <button
                                    onClick={() => navigate('/admin/management', { state: { activeTab: 'submissions' } })}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition font-bold text-sm shadow-sm"
                                >
                                    <FileCheck className="w-4 h-4" />
                                    <span className="hidden sm:inline">Submissions</span>
                                </button>
                            )}                            {(hasPerm('manage_users') || hasPerm('manage_labs') || hasPerm('provision_labs') || hasPerm('manage_roles') || hasPerm('view_feedback') || hasPerm('view_analytics') || hasPerm('view_submissions')) ? (
                                <button
                                    onClick={() => navigate('/admin/management')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition font-bold text-sm shadow-sm"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span className="hidden sm:inline">Manage</span>
                                </button>
                            ) : null}
                            <button
                                onClick={() => (hasPerm('view_feedback') && user?.role !== 'student') ? navigate('/admin/management', { state: { activeTab: 'feedback' } }) : setIsFeedbackModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition font-bold text-sm border border-slate-200"
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span className="hidden sm:inline">Feedback</span>
                            </button>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 rounded-xl transition font-bold text-sm border border-red-100"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 rounded-2xl">
                                <BookOpen className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Available Labs</p>
                                <p className="text-2xl font-black text-slate-900">{labs.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 rounded-2xl">
                                <Calendar className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                    {user?.role === 'student' ? 'Active Labs' : 'Sessions'}
                                </p>
                                <p className="text-2xl font-black text-slate-900">
                                    {user?.role === 'student' ? filteredLabs.length : (user?.role === 'admin' ? bookings.length : labs.length)}
                                </p>
                            </div>
                        </div>
                    </div>
                    {(user?.role === 'facilitator' || user?.role === 'admin' || user?.role === 'lab technician') ? (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 rounded-2xl">
                                    <FileCheck className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Pending Reviews</p>
                                    <p className="text-2xl font-black text-slate-900">{pendingSubmissions}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 rounded-2xl">
                                    <Award className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">My Progress</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {results.length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                {/* Programme Selector - Students Only */}
                {
                    user?.role === 'student' && user.programmes && user.programmes.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">
                                {user.programmes.length > 1 ? 'Select Your Programme' : 'Your Enrolled Programme'}
                            </h2>
                            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                <div className={`grid grid-cols-1 ${user.programmes.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
                                    {user.programmes.map((prog) => (
                                        <label
                                            key={prog}
                                            className={`transition-all ${user.programmes && user.programmes.length > 1 ? 'cursor-pointer' : ''} ${selectedProgramme === prog ? 'ring-2 ring-green-500 rounded-3xl transform scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="programme"
                                                className="sr-only"
                                                checked={selectedProgramme === prog}
                                                onChange={() => setSelectedProgramme(prog)}
                                                disabled={user.programmes && user.programmes.length === 1}
                                            />
                                            <div className="h-full rounded-2xl p-6 border flex flex-col items-center justify-center text-center gap-3 bg-slate-50 border-slate-100">
                                                {prog.includes('Intelligence') && <Cpu className="w-8 h-8 text-green-600" />}
                                                {prog.includes('Cybersecurity') && <Shield className="w-8 h-8 text-green-600" />}
                                                {(prog.includes('Information') || prog.includes('MIS')) && <Database className="w-8 h-8 text-green-600" />}
                                                {!prog.includes('Intelligence') && !prog.includes('Cybersecurity') && !prog.includes('Information') && !prog.includes('MIS') && <BookOpen className="w-8 h-8 text-green-600" />}
                                                <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{prog}</h3>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Labs Section */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Available Virtual Labs</h2>
                        {(user?.role === 'facilitator' || user?.role === 'lab technician') && (
                            <button
                                onClick={() => window.open(NOUN_ELEARN_URL, '_blank')}
                                className="flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 hover:bg-green-100 rounded-full transition-colors group/btn"
                            >
                                <Calendar className="w-4 h-4 text-green-600 group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Schedule for Lab</span>
                            </button>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="text-center text-green-600 py-12 font-bold animate-pulse">Initializing Lab Environment...</div>
                    ) : filteredLabs.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
                            <p className="text-slate-500 font-bold">
                                {user?.role === 'student' && !selectedProgramme
                                    ? "Select a programme to view associated laboratories."
                                    : "No active laboratories available for your current selection."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLabs.map((lab) => {
                                const hasActiveBooking = bookings.some(b =>
                                    b.lab._id === lab._id &&
                                    ['confirmed', 'requested', 'granted', 'active'].includes(b.status)
                                );
                                
                                const isFacilitatorInProgramme = (user?.role === 'facilitator' || user?.role === 'lab technician') && 
                                    user.programmes?.some(p => getProgrammeType(p) === lab.type);

                                const isStudentInProgramme = user?.role === 'student' && 
                                    user.programmes?.some(p => getProgrammeType(p) === lab.type);

                                // Admins, facilitators in programme, and enrolled students can launch directly.
                                const canLaunch = user?.role === 'admin' || isFacilitatorInProgramme || isStudentInProgramme || hasActiveBooking;

                                return (
                                    <div
                                        key={lab._id}
                                        className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-green-300 hover:shadow-md transition-all flex flex-col group"
                                    >
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="p-4 bg-green-50 rounded-2xl group-hover:bg-green-100 transition-colors">{getLabIcon(lab.type)}</div>
                                            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                                                {lab.type}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">{lab.name}</h3>
                                        <p className="text-slate-500 text-sm mb-6 flex-1 leading-relaxed font-medium">{lab.description}</p>
                                        <div className="flex items-center gap-2 text-[10px] mb-6 font-black text-slate-400 uppercase tracking-widest">
                                            <Users className="w-4 h-4" />
                                            <span>Capacity: {lab.capacity}</span>
                                        </div>
                                        <div className="mt-auto">
                                            {canLaunch ? (
                                                (() => {
                                                    const relevantBooking = bookings.find(b => 
                                                        b.lab._id === lab._id && 
                                                        ['confirmed', 'requested', 'granted', 'active'].includes(b.status)
                                                    );

                                                    // Launch directly for admin, facilitators in programme, enrolled students, or anyone with an active/granted booking
                                                        if (user?.role === 'admin' || isFacilitatorInProgramme || isStudentInProgramme || (relevantBooking && (relevantBooking.status === 'granted' || relevantBooking.status === 'active'))) {
                                                        return (
                                                            <div className="flex flex-col gap-3">
                                                                <button
                                                                    onClick={() => window.open(AWS_LAUNCH_URL, '_blank')}
                                                                    className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-sm font-black transition text-center flex items-center justify-center gap-2 shadow-sm uppercase tracking-widest"
                                                                >
                                                                    <Play className="w-4 h-4 fill-current" />
                                                                    Launch Lab
                                                                </button>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {user?.role === 'student' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedLabForBooking(lab);
                                                                                setIsBookingModalOpen(true);
                                                                            }}
                                                                            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black transition text-center border border-slate-200 uppercase tracking-widest"
                                                                        >
                                                                            Booking
                                                                        </button>
                                                                    )}
                                                                    {hasPerm('submit_assignments') && (
                                                                        <button
                                                                            onClick={() => window.open(NOUN_ELEARN_URL, '_blank')}
                                                                            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black transition text-center border border-slate-200 uppercase tracking-widest"
                                                                        >
                                                                            Submit Task
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (relevantBooking && relevantBooking.status === 'pending') {
                                                        return (
                                                            <div className="flex flex-col gap-3">
                                                                <div className="w-full px-6 py-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-[10px] font-black text-center flex flex-col gap-1 shadow-sm uppercase tracking-widest">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Clock className="w-4 h-4 animate-pulse" />
                                                                        Booking Pending
                                                                    </div>
                                                                    <span className="text-[10px] opacity-70">Waiting for Admin Approval</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (relevantBooking && relevantBooking.status === 'confirmed') {
                                                        return (
                                                            <button
                                                                onClick={() => navigate(`/lab/${lab._id}`)}
                                                                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-sm font-black transition shadow-sm text-center flex items-center justify-center gap-2 uppercase tracking-widest"
                                                            >
                                                                <Play className="w-4 h-4 fill-current" />
                                                                Launch Lab
                                                            </button>
                                                        );
                                                    } else if (hasPerm('view_labs')) {
                                                        return (
                                                            <button
                                                                onClick={() => navigate(`/lab/${lab._id}`)}
                                                                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-sm font-black transition text-center flex items-center justify-center gap-2 shadow-sm uppercase tracking-widest"
                                                            >
                                                                <Play className="w-4 h-4" />
                                                                Access Lab
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()
                                            ) : (
                                                hasPerm('book_labs') && user?.role === 'student' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLabForBooking(lab);
                                                            setIsBookingModalOpen(true);
                                                            setBookingError(null);
                                                        }}
                                                        className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-sm font-black transition shadow-sm text-center flex items-center justify-center gap-2 uppercase tracking-widest"
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

                {/* Recent Bookings - Hidden for facilitators/technicians as per request */}
                {hasPerm('view_booking_history') && user?.role !== 'facilitator' && user?.role !== 'lab technician' && (
                    <div className="mb-12">
                        <h2 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-green-600" />
                            My Booking History
                        </h2>
                        {bookings.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
                                <p className="text-slate-500 font-bold">No active bookings recorded in your history.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    Laboratory
                                                </th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    Start Time
                                                </th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    End Time
                                                </th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    Status
                                                </th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    Action / Note
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bookings.slice(0, 10).map((booking) => (
                                                <tr key={booking._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-8 py-5 text-sm font-black text-slate-900 uppercase tracking-tight">{booking.lab.name}</td>
                                                    <td className="px-8 py-5 text-sm font-bold text-slate-500">
                                                        {new Date(booking.startTime).toLocaleString()}
                                                    </td>
                                                    <td className="px-8 py-5 text-sm font-bold text-slate-500">
                                                        {new Date(booking.endTime).toLocaleString()}
                                                    </td>
                                                    <td className="px-8 py-5 text-sm">
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${booking.status === 'granted' || booking.status === 'active'
                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                : booking.status === 'requested' || booking.status === 'pending'
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : booking.status === 'confirmed'
                                                                        ? 'bg-green-100 text-green-800 border-green-300'
                                                                        : booking.status === 'cancelled'
                                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                                }`}
                                                        >
                                                            {booking.status === 'cancelled' && booking.adminNote ? 'Rejected' : booking.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-sm">
                                                        {booking.status === 'granted' || booking.status === 'active' || booking.status === 'confirmed' ? (
                                                            <button 
                                                                onClick={() => window.open(AWS_LAUNCH_URL, '_blank')}
                                                                className="text-green-600 hover:text-green-700 font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors"
                                                            >
                                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                                Launch
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 text-[10px] font-bold italic truncate max-w-[150px] block" title={booking.adminNote}>
                                                                {booking.adminNote || 'No notes'}
                                                            </span>
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
                )}

                {/* Grades & Feedback */}
                {
                    results.length > 0 && (
                        <div>
                            <h2 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-3">
                                <Award className="w-6 h-6 text-green-600" />
                                Performance & Feedback
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {results.map(result => (
                                    <div key={result._id} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-2 ${result.grade >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                                                result.grade >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                {result.grade}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 uppercase tracking-tight text-lg">{result.lab?.name}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted: {new Date(result.submittedAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                                            {result.feedback && (
                                                <div className="flex-1 md:max-w-md text-sm font-bold text-slate-600 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                                                    <MessageSquare className="w-4 h-4 inline-block mr-2 text-green-600" />
                                                    {result.feedback}
                                                </div>
                                            )}
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${result.grade >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                                                result.grade >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                {result.grade >= 70 ? 'Excellent' : result.grade >= 50 ? 'Proficient' : 'Action Required'}
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
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsBookingModalOpen(false)}
                        ></div>
                        <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-8 border-b border-slate-100">
                                <div>
                                    <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tight">
                                        <Calendar className="w-6 h-6 text-green-600" />
                                        Lab Booking
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedLabForBooking.name}</p>
                                </div>
                                <button
                                    onClick={() => setIsBookingModalOpen(false)}
                                    className="p-3 hover:bg-slate-50 rounded-2xl transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleBookingSubmit} className="p-8 space-y-6">
                                {bookingError && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {bookingError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                        <input
                                            required
                                            type="date"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={bookingData.date}
                                            onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-900 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose</label>
                                        <input
                                            type="text"
                                            placeholder="Session reason"
                                            value={bookingData.purpose}
                                            onChange={e => setBookingData({ ...bookingData, purpose: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-900 font-bold placeholder-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start</label>
                                        <input
                                            required
                                            type="time"
                                            value={bookingData.startTime}
                                            onChange={e => setBookingData({ ...bookingData, startTime: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-900 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End</label>
                                        <input
                                            required
                                            type="time"
                                            value={bookingData.endTime}
                                            onChange={e => setBookingData({ ...bookingData, endTime: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-900 font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsBookingModalOpen(false)}
                                        className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isBookingSubmitting}
                                        className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-2xl font-black transition shadow-sm flex items-center justify-center gap-2 uppercase tracking-widest"
                                    >
                                        {isBookingSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm'}
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
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setIsFeedbackModalOpen(false)}
                    ></div>
                    <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-8 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tight">
                                    <MessageSquare className="w-6 h-6 text-green-600" />
                                    User Feedback
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsFeedbackModalOpen(false)}
                                className="p-3 hover:bg-slate-50 rounded-2xl transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleFeedbackSubmit} className="p-8 space-y-6">
                            {feedbackStatus && (
                                <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${feedbackStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                                    }`}>
                                    {feedbackStatus.message}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic</label>
                                <input
                                    required
                                    type="text"
                                    value={feedbackData.subject}
                                    onChange={e => setFeedbackData({ ...feedbackData, subject: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-900 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={feedbackData.message}
                                    onChange={e => setFeedbackData({ ...feedbackData, message: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-900 font-bold resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isFeedbackSubmitting}
                                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black transition shadow-sm uppercase tracking-widest"
                            >
                                {isFeedbackSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Send Feedback'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;