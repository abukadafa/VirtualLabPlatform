import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
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
    FileCheck,
    Info
} from 'lucide-react';

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
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const [labs, setLabs] = useState<Lab[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingSubmissions, setPendingSubmissions] = useState(0);
    const [selectedProgramme, setSelectedProgramme] = useState<string | null>(
        user?.programmes && user.programmes.length > 0 ? user.programmes[0] : null
    );

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

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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



    // Filter labs based on user's programmes and active status
    const filteredLabs = labs.filter((lab) => {
        // For students: match selected programme and only show active labs
        if (user?.role === 'student') {
            const programmeMatch = selectedProgramme
                ? lab.type === getProgrammeType(selectedProgramme)
                : false;
            return programmeMatch && lab.status === 'active';
        }

        // For facilitators: backend already returns only enrolled labs
        if (user?.role === 'facilitator') {
            return true;
        }

        // For admins: show all labs
        if (user?.role === 'admin') {
            return true;
        }

        // For admin: show all labs
        return true;
    });

    // Filter bookings - students only see confirmed/active bookings
    const displayBookings = user?.role === 'student'
        ? bookings.filter(b => b.status === 'confirmed' || b.status === 'active' || b.status === 'completed')
        : bookings;

    return (
        <div className="min-h-screen bg-acetel-green">
            {/* Header */}
            <header className="header-acetel shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            <Logo type="noun" className="h-12" />
                            <div className="h-12 w-px bg-white/30 hidden sm:block"></div>
                            <Logo type="acetel" className="h-14 hidden sm:block" />
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <div className="text-right hidden md:block">
                                <h1 className="text-xl font-bold font-heading text-[#1a2b48]">Africa Centre of Excellence on Technology Enhanced Learning (ACETEL)</h1>
                                <p className="text-acetel-green font-medium text-sm">Virtual Laboratory</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-acetel-navy/5 text-acetel-navy rounded-full text-xs font-bold uppercase tracking-wider border border-acetel-navy/10">
                                    {user?.role}
                                </span>
                                {(user?.role === 'facilitator' || user?.role === 'admin') && (
                                    <button
                                        onClick={() => navigate('/facilitator/submissions')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#008751] hover:bg-[#00a562] text-white text-xs font-bold rounded-lg transition"
                                    >
                                        <FileCheck className="w-3.5 h-3.5" />
                                        Submissions
                                    </button>
                                )}
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => navigate('/admin/management')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-acetel-navy text-xs font-bold rounded-lg transition border border-gray-200"
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                        Admin
                                    </button>
                                )}
                                <button
                                    onClick={logout}
                                    className="p-2 hover:bg-gray-100 text-acetel-navy rounded-full transition"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="card-acetel p-6 border-l-4 border-l-[#1a2b48]">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#1a2b48]/10 rounded-lg text-[#1a2b48]">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Available Labs</p>
                                <p className="text-2xl font-bold text-acetel-navy">{labs.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-acetel p-6 border-l-4 border-l-[#008751]">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#008751]/10 rounded-lg text-[#008751]">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">My Bookings</p>
                                <p className="text-2xl font-bold text-acetel-navy">{bookings.length}</p>
                            </div>
                        </div>
                    </div>
                    {(user?.role === 'facilitator' || user?.role === 'admin') ? (
                        <div className="card-acetel p-6 border-l-4 border-l-orange-500">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500/10 rounded-lg text-orange-600">
                                    <FileCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Pending Reviews</p>
                                    <p className="text-2xl font-bold text-acetel-navy">{pendingSubmissions}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card-acetel p-6 border-l-4 border-l-purple-500">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-600">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Active Sessions</p>
                                    <p className="text-2xl font-bold text-acetel-navy">
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
                                            className={`cursor-pointer transition-all ${selectedProgramme === prog ? 'ring-2 ring-blue-500 rounded-xl transform scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
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
                                            ${prog === 'Artificial Intelligence' ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30' : ''}
                                            ${prog === 'Cybersecurity' ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30' : ''}
                                            ${prog === 'Management Information System' ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30' : ''}
                                        `}>
                                                {prog === 'Artificial Intelligence' && <Cpu className="w-8 h-8 text-blue-400" />}
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
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-acetel-navy font-heading">Available Virtual Labs</h2>
                            <p className="text-slate-500 text-sm">Select a lab to start your session</p>
                        </div>
                        {user?.role === 'student' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Booking Required</span>
                            </div>
                        )}
                        {user?.role === 'facilitator' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-acetel-green/10 text-acetel-green border border-acetel-green/20 rounded-lg">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Direct Access Enrolled</span>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-acetel-green animate-spin" />
                            <p className="mt-4 text-slate-500 font-medium">Loading labs...</p>
                        </div>
                    ) : filteredLabs.length === 0 ? (
                        <div className="card-acetel p-12 text-center">
                            <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">
                                {user?.role === 'student' && !selectedProgramme
                                    ? "Please select a programme above to view available labs."
                                    : "No labs available matching your enrolled programmes."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredLabs.map((lab) => {
                                const hasActiveBooking = bookings.some(b =>
                                    b.lab._id === lab._id &&
                                    (b.status === 'confirmed' || b.status === 'active')
                                );
                                // Facilitators and Admins can launch directly if correctly assigned/authorized
                                const canLaunch = user?.role === 'admin' || user?.role === 'facilitator' || hasActiveBooking;

                                return (
                                    <div
                                        key={lab._id}
                                        className="card-acetel p-6 hover:border-acetel-green transition-all flex flex-col group"
                                    >
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="p-4 bg-acetel-green/10 rounded-xl group-hover:bg-acetel-green group-hover:text-white transition-colors">
                                                {getLabIcon(lab.type)}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                                    {lab.type}
                                                </span>
                                                {lab.status === 'active' && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold uppercase">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                        Ready
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-acetel-navy mb-3 group-hover:text-acetel-green transition-colors font-heading">
                                            {lab.name}
                                        </h3>
                                        <p className="text-slate-600 text-sm mb-6 flex-1 line-clamp-3 leading-relaxed">
                                            {lab.description}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 mb-6 border-t border-slate-50 pt-6">
                                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                <Users className="w-4 h-4" />
                                                <span>Cap: {lab.capacity}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                <Cpu className="w-4 h-4" />
                                                <span>{lab.software?.length || 0} Tools</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            {canLaunch ? (
                                                <button
                                                    onClick={() => navigate(`/lab/${lab._id}`)}
                                                    className="w-full flex items-center justify-center gap-2 btn-acetel-primary"
                                                >
                                                    <Cpu className="w-4 h-4" />
                                                    Launch Lab
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedLabForBooking(lab);
                                                        setIsBookingModalOpen(true);
                                                        setBookingError(null);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 btn-acetel-outline"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    Book Session
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Bookings */}
                {/* Recent Bookings */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold text-acetel-navy mb-6 font-heading">My Recent Bookings</h2>
                    {displayBookings.length === 0 ? (
                        <div className="card-acetel p-8 text-center text-slate-400">
                            No bookings yet. Click on a lab to get started!
                        </div>
                    ) : (
                        <div className="card-acetel overflow-hidden border-none shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lab</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {displayBookings.slice(0, 5).map((booking) => (
                                            <tr key={booking._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-acetel-navy">{booking.lab.name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(booking.startTime).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(booking.endTime).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-acetel-green/10 text-acetel-green' :
                                                        booking.status === 'active' ? 'bg-[#1a2b48]/10 text-[#1a2b48]' :
                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {booking.status}
                                                    </span>
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
                {results.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold text-acetel-navy mb-6 flex items-center gap-2 font-heading">
                            <Award className="w-6 h-6 text-acetel-green" />
                            My Grades & Feedback
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {results.map(result => (
                                <div key={result._id} className="card-acetel p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${result.grade >= 70 ? 'bg-acetel-green/10 text-acetel-green border border-acetel-green/20' :
                                            result.grade >= 50 ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                'bg-red-50 text-red-600 border border-red-100'
                                            }`}>
                                            {result.grade}
                                        </div>
                                        <div>
                                            <div className="font-bold text-acetel-navy text-lg">{result.lab?.name}</div>
                                            <div className="text-xs text-slate-400 font-medium">Submitted {new Date(result.submittedAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        {result.feedback && (
                                            <div className="flex-1 sm:max-w-[200px] text-xs text-slate-600 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 italic">
                                                "{result.feedback}"
                                            </div>
                                        )}
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${result.grade >= 70 ? 'bg-acetel-green text-white' :
                                            result.grade >= 50 ? 'bg-orange-500 text-white' :
                                                'bg-red-500 text-white'
                                            }`}>
                                            {result.grade >= 70 ? 'Excellent' : result.grade >= 50 ? 'Pass' : 'Improve'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
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
        </div>
    );
};

export default Dashboard;
