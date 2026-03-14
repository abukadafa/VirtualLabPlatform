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
    Play
} from 'lucide-react';
import { API_URL, AWS_LAUNCH_URL, NOUN_ELEARN_URL } from '../lib/config';
import Footer from '../components/Footer';

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
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    provisioningType?: 'aws' | 'local' | null;
    provisioningStatus?: 'not_started' | 'pending' | 'provisioned' | 'failed' | 'expired' | 'deleted';
    expiresAt?: string;
    extensionStatus?: 'none' | 'requested' | 'approved' | 'rejected';
    extensionRequestedUntil?: string;
    extensionReason?: string;
    purpose?: string;
    adminNote?: string;
    provisionedUrl?: string;
    awsProvisioning?: {
        launchUrl?: string;
        accountLabel?: string;
    };
    localProvisioning?: {
        templateName?: string;
        vmId?: string;
        username?: string;
        password?: string;
        ipAddress?: string;
        sshPort?: number;
        cpuCores?: number;
        memoryMb?: number;
        diskGb?: number;
    };
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

    const isBookingProvisioned = (booking: Booking) =>
        booking.approvalStatus === 'approved' && booking.provisioningStatus === 'provisioned';

    const getBookingDisplayStatus = (booking: Booking) => {
        if (booking.approvalStatus === 'rejected') return 'rejected';
        if (booking.extensionStatus === 'requested') return 'extension requested';
        if (booking.provisioningStatus === 'provisioned') return booking.provisioningType === 'local' ? 'local ready' : 'aws ready';
        if (booking.approvalStatus === 'approved') return 'approved';
        if (booking.provisioningStatus === 'pending') return 'provisioning';
        return booking.status;
    };

    const handleLaunchBooking = (booking: Booking) => {
        if (booking.provisioningType === 'aws') {
            window.open(booking.awsProvisioning?.launchUrl || booking.provisionedUrl || AWS_LAUNCH_URL, '_blank');
            return;
        }

        if (booking.provisioningType === 'local') {
            navigate(`/bookings/${booking._id}/terminal`);
            return;
        }

        window.open(AWS_LAUNCH_URL, '_blank');
    };

    const requestExtension = async (booking: Booking) => {
        const requestedEndTime = window.prompt('Enter the new end date/time in ISO-like format, e.g. 2026-03-15T18:00');
        if (!requestedEndTime) return;
        const reason = window.prompt('Reason for extension request') || '';
        const requestedDate = new Date(requestedEndTime);
        if (Number.isNaN(requestedDate.getTime())) {
            window.alert('Invalid date/time format');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/bookings/${booking._id}/request-extension`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestedEndTime: requestedDate.toISOString(),
                    reason
                })
            });

            const data = await response.json();
            if (!response.ok) {
                window.alert(data.message || 'Failed to request extension');
                return;
            }

            fetchBookings();
        } catch (error: any) {
            window.alert(`Failed to request extension: ${error.message}`);
        }
    };

    const getLabIcon = (type: string) => {
        switch (type) {
            case 'AI':
                return <Cpu className="w-6 h-6 text-primary" />;
            case 'Cybersecurity':
                return <Shield className="w-6 h-6 text-primary" />;
            case 'MIS':
                return <Database className="w-6 h-6 text-primary" />;
            default:
                return <BookOpen className="w-6 h-6 text-primary" />;
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
        <div className="min-h-screen bg-white text-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b-4 border-primary sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                <img 
                                    src={branding?.logoUrl || "https://nou.edu.ng/wp-content/uploads/2021/12/Logo-1.png"} 
                                    alt="NOUN Logo" 
                                    className="h-14 object-contain" 
                                />
                                <div className="h-10 w-[1px] bg-slate-200 hidden sm:block"></div>
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-black text-primary leading-tight">
                                        {branding?.appName?.split(' ')[0] || 'ACETEL'}
                                    </h1>
                                    <h1 className="text-sm font-bold text-slate-600 tracking-tight">
                                        {branding?.appName?.split(' ').slice(1).join(' ') || 'Virtual Laboratory Platform'}
                                    </h1>
                                </div>
                                <div className="h-10 w-[1px] bg-slate-200 hidden sm:block"></div>
                                <img 
                                    src={branding?.secondaryLogoUrl || "https://nou.edu.ng/wp-content/uploads/2022/02/logo.png"} 
                                    alt="ACETEL Logo" 
                                    className="h-12 object-contain" 
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline-block px-3 py-1 bg-primary/10 text-primary/80 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/30">
                                {user?.role}
                            </span>
                            {hasPerm('view_submissions') && (
                                <button
                                    onClick={() => navigate('/admin/management', { state: { activeTab: 'submissions' } })}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl transition font-bold text-sm shadow-sm"
                                >
                                    <FileCheck className="w-4 h-4" />
                                    <span className="hidden sm:inline">Submissions</span>
                                </button>
                            )}                            {(hasPerm('manage_users') || hasPerm('manage_labs') || hasPerm('provision_labs') || hasPerm('manage_roles') || hasPerm('view_feedback') || hasPerm('view_analytics') || hasPerm('view_submissions')) ? (
                                <button
                                    onClick={() => navigate('/admin/management')}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl transition font-bold text-sm shadow-sm"
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
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Available Labs</p>
                                <p className="text-2xl font-black text-slate-900">{labs.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <Calendar className="w-6 h-6 text-primary" />
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
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <FileCheck className="w-6 h-6 text-primary" />
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
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <Award className="w-6 h-6 text-primary" />
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
                                            className={`transition-all ${user.programmes && user.programmes.length > 1 ? 'cursor-pointer' : ''} ${selectedProgramme === prog ? 'ring-2 ring-primary rounded-3xl transform scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
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
                                                {prog.includes('Intelligence') && <Cpu className="w-8 h-8 text-primary" />}
                                                {prog.includes('Cybersecurity') && <Shield className="w-8 h-8 text-primary" />}
                                                {(prog.includes('Information') || prog.includes('MIS')) && <Database className="w-8 h-8 text-primary" />}
                                                {!prog.includes('Intelligence') && !prog.includes('Cybersecurity') && !prog.includes('Information') && !prog.includes('MIS') && <BookOpen className="w-8 h-8 text-primary" />}
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
                                className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 rounded-full transition-colors group/btn"
                            >
                                <Calendar className="w-4 h-4 text-primary group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest">Schedule for Lab</span>
                            </button>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="text-center text-primary py-12 font-bold animate-pulse">Initializing Lab Environment...</div>
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
                                const hasProvisionedBooking = bookings.some(b =>
                                    b.lab._id === lab._id &&
                                    isBookingProvisioned(b)
                                );
                                
                                const isFacilitatorInProgramme = (user?.role === 'facilitator' || user?.role === 'lab technician') && 
                                    user.programmes?.some(p => getProgrammeType(p) === lab.type);

                                const canLaunch = user?.role === 'admin' || isFacilitatorInProgramme || hasProvisionedBooking;

                                return (
                                    <div
                                        key={lab._id}
                                        className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-primary/40 hover:shadow-md transition-all flex flex-col group"
                                    >
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">{getLabIcon(lab.type)}</div>
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
                                                        (b.approvalStatus === 'approved' || b.approvalStatus === 'pending') &&
                                                        b.status !== 'cancelled'
                                                    );

                                                    if (user?.role === 'admin' || isFacilitatorInProgramme || (relevantBooking && isBookingProvisioned(relevantBooking))) {
                                                        return (
                                                            <div className="flex flex-col gap-3">
                                                                <button
                                                                    onClick={() => relevantBooking ? handleLaunchBooking(relevantBooking) : window.open(AWS_LAUNCH_URL, '_blank')}
                                                                    className="w-full px-6 py-4 bg-primary hover:bg-primary/80 text-white rounded-2xl text-sm font-black transition text-center flex items-center justify-center gap-2 shadow-sm uppercase tracking-widest"
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
                                                    } else if (relevantBooking && relevantBooking.approvalStatus === 'pending') {
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
                                                    } else if (relevantBooking && relevantBooking.approvalStatus === 'approved') {
                                                        return (
                                                            <div className="w-full px-6 py-4 bg-sky-50 border border-sky-200 text-sky-700 rounded-2xl text-[10px] font-black text-center flex flex-col gap-1 shadow-sm uppercase tracking-widest">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    Awaiting Provisioning
                                                                </div>
                                                                <span className="text-[10px] opacity-70">Technician approval complete. Provisioning pending.</span>
                                                            </div>
                                                        );
                                                    } else if (hasPerm('view_labs')) {
                                                        return (
                                                            <button
                                                                onClick={() => navigate(`/lab/${lab._id}`)}
                                                                className="w-full px-6 py-4 bg-primary hover:bg-primary/80 text-white rounded-2xl text-sm font-black transition text-center flex items-center justify-center gap-2 shadow-sm uppercase tracking-widest"
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
                                                        className="w-full px-6 py-4 bg-primary hover:bg-primary/80 text-white rounded-2xl text-sm font-black transition shadow-sm text-center flex items-center justify-center gap-2 uppercase tracking-widest"
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
                            <Calendar className="w-6 h-6 text-primary" />
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
                                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${booking.provisioningStatus === 'provisioned'
                                                                ? 'bg-primary/10 text-primary/80 border-primary/30'
                                                                : booking.extensionStatus === 'requested' || booking.approvalStatus === 'pending' || booking.provisioningStatus === 'pending'
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : booking.approvalStatus === 'approved'
                                                                        ? 'bg-primary/20 text-primary/90 border-primary/40'
                                                                        : booking.approvalStatus === 'rejected' || booking.status === 'cancelled'
                                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                                }`}
                                                        >
                                                            {getBookingDisplayStatus(booking)}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-sm">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            {isBookingProvisioned(booking) && (
                                                                <button
                                                                    onClick={() => handleLaunchBooking(booking)}
                                                                    className="text-primary hover:text-primary/80 font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors"
                                                                >
                                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                                    Launch
                                                                </button>
                                                            )}
                                                            {isBookingProvisioned(booking) && booking.extensionStatus !== 'requested' && (
                                                                <button
                                                                    onClick={() => requestExtension(booking)}
                                                                    className="text-slate-600 hover:text-slate-900 font-black uppercase tracking-widest text-[10px] transition-colors"
                                                                >
                                                                    Request Extension
                                                                </button>
                                                            )}
                                                            {!isBookingProvisioned(booking) && (
                                                                <span className="text-slate-400 text-[10px] font-bold italic truncate max-w-[180px] block" title={booking.adminNote}>
                                                                    {booking.adminNote || 'No notes'}
                                                                </span>
                                                            )}
                                                        </div>
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
                                <Award className="w-6 h-6 text-primary" />
                                Performance & Feedback
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {results.map(result => (
                                    <div key={result._id} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-2 ${result.grade >= 70 ? 'bg-primary/10 text-primary/80 border-primary/30' :
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
                                                    <MessageSquare className="w-4 h-4 inline-block mr-2 text-primary" />
                                                    {result.feedback}
                                                </div>
                                            )}
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${result.grade >= 70 ? 'bg-primary/10 text-primary/80 border-primary/30' :
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
                                        <Calendar className="w-6 h-6 text-primary" />
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
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-slate-900 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose</label>
                                        <input
                                            type="text"
                                            placeholder="Session reason"
                                            value={bookingData.purpose}
                                            onChange={e => setBookingData({ ...bookingData, purpose: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-slate-900 font-bold placeholder-slate-300"
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
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-slate-900 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End</label>
                                        <input
                                            required
                                            type="time"
                                            value={bookingData.endTime}
                                            onChange={e => setBookingData({ ...bookingData, endTime: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-slate-900 font-bold"
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
                                        className="flex-1 px-6 py-4 bg-primary hover:bg-primary/80 disabled:bg-primary/60 text-white rounded-2xl font-black transition shadow-sm flex items-center justify-center gap-2 uppercase tracking-widest"
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
                                    <MessageSquare className="w-6 h-6 text-primary" />
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
                                <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${feedbackStatus.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary/80' : 'bg-red-50 border-red-200 text-red-700'
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-slate-900 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={feedbackData.message}
                                    onChange={e => setFeedbackData({ ...feedbackData, message: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary outline-none text-slate-900 font-bold resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isFeedbackSubmitting}
                                className="w-full px-6 py-4 bg-primary hover:bg-primary/80 text-white rounded-2xl font-black transition shadow-sm uppercase tracking-widest"
                            >
                                {isFeedbackSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Send Feedback'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Dashboard;
