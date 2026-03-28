import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ArrowLeft,
    Play,
    Square,
    Clock,
    Loader2,
    AlertCircle,
    RefreshCw,
    Maximize2,
    Users,
    ClipboardCheck,
    FileCheck,
    LogOut
} from 'lucide-react';
import AssignmentUpload from '../components/AssignmentUpload';
import { API_URL, NOUN_ELEARN_URL } from '../lib/config';

interface Lab {
    _id: string;
    name: string;
    type: 'AI' | 'Cybersecurity' | 'MIS';
    description: string;
    software: string[];
    capacity: number;
}

type SessionState =
    | 'idle'
    | 'queued'
    | 'starting'
    | 'connecting'
    | 'active'
    | 'idle_warning'
    | 'paused'
    | 'error';

interface SessionData {
    sessionId: string;
    state: SessionState;
    queuePosition?: number;
    estimatedWaitTime?: number;
    guacamoleUrl?: string;
    startedAt?: string;
    lastActivityAt?: string;
}

const LabEnvironment: React.FC = () => {
    const { labId } = useParams();
    const navigate = useNavigate();
    const { token, user, logout } = useAuth();

    const [lab, setLab] = useState<Lab | null>(null);
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
    const [showSubmissions, setShowSubmissions] = useState(false);

    // Heartbeat to keep session alive
    const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const statusPollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchLabDetails();
        checkExistingSession();
        verifyAccess();
        fetchLabAssignments();

        return () => {
            // Cleanup intervals on unmount
            if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
            if (statusPollInterval.current) clearInterval(statusPollInterval.current);
        };
    }, [labId]);

    // Start heartbeat when session becomes active
    useEffect(() => {
        if (sessionState === 'active' && sessionData?.sessionId) {
            startHeartbeat();
        } else {
            stopHeartbeat();
        }
    }, [sessionState, sessionData]);

    const fetchLabDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/api/labs/${labId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setLab(data);
            }
        } catch (error) {
            console.error('Failed to fetch lab:', error);
        }
    };

    const checkExistingSession = async () => {
        try {
            const response = await fetch(`${API_URL}/api/labs/${labId}/status`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setSessionData(data);
                setSessionState(data.state);

                // If session is starting or queued, poll for updates
                if (data.state === 'starting' || data.state === 'queued') {
                    startStatusPolling();
                }
            }
        } catch (error) {
            // No active session, that's okay
            console.log('No existing session');
        }
    };

    const verifyAccess = async () => {
        if (!token || !user) return;

        try {
            // Map full programme names to lab types (consistent with backend)
            const typeMapping: { [key: string]: string } = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };

            const isEnrolledInProgramme = lab && (user.programmes || []).some(p => typeMapping[p] === lab.type);

            // Check if facilitator/technician is in the programme for this lab
            const isTechnicianOrFacilitatorInProgramme = (user.role === 'facilitator' || user.role === 'lab technician') && isEnrolledInProgramme;

            if (user.role === 'admin' || isTechnicianOrFacilitatorInProgramme || (user.role === 'student' && isEnrolledInProgramme)) {
                // Fetch bookings anyway to see if there's one to associate
                const bResponse = await fetch(`${API_URL}/api/bookings/my-bookings`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (bResponse.ok) {
                    const bookings: any[] = await bResponse.json();
                    const activeBooking = bookings.find(b =>
                        b.lab._id === labId &&
                        b.approvalStatus === 'approved' &&
                        b.provisioningStatus === 'provisioned'
                    );
                    if (activeBooking) setActiveBookingId(activeBooking._id);
                }
                return; 
            }

            const response = await fetch(`${API_URL}/api/bookings/my-bookings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const bookings: any[] = await response.json();
                const activeBooking = bookings.find(b =>
                    b.lab._id === labId &&
                    b.approvalStatus === 'approved' &&
                    b.provisioningStatus === 'provisioned'
                );

                if (activeBooking) {
                    setActiveBookingId(activeBooking._id);
                } else {
                    setError('Access Denied. You do not have an approved and provisioned booking for this lab.');
                    setSessionState('error');
                    setTimeout(() => navigate('/dashboard'), 3000);
                }
            }
        } catch (error) {
            console.error('Failed to verify access:', error);
        }
    };

    const fetchLabAssignments = async () => {
        try {
            const response = await fetch(`${API_URL}/api/assignments/lab/${labId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setAssignments(data);
            }
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
        }
    };

    const startSession = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/labs/${labId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setSessionData(data);
                setSessionState(data.state);
                
                if (data.state === 'starting' || data.state === 'queued') {
                    startStatusPolling();
                } else if (data.state === 'active') {
                    fetchConnectionUrl();
                }
            } else {
                setError(data.message || 'Failed to start lab session');
                setSessionState('error');
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            setError('Connection error. Please try again.');
            setSessionState('error');
        } finally {
            setIsLoading(false);
        }
    };

    const stopSession = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/labs/${labId}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setSessionState('idle');
                setSessionData(null);
                stopHeartbeat();
                stopStatusPolling();
            }
        } catch (error) {
            console.error('Failed to stop session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const startHeartbeat = () => {
        // Send heartbeat every 5 minutes to extend session
        heartbeatInterval.current = setInterval(async () => {
            try {
                await fetch(`${API_URL}/api/labs/${labId}/extend`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });
                console.log('Session extended');
            } catch (error) {
                console.error('Heartbeat failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    };

    const stopHeartbeat = () => {
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
            heartbeatInterval.current = null;
        }
    };

    const startStatusPolling = () => {
        // Poll status every 3 seconds when queued/starting
        statusPollInterval.current = setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}/api/labs/${labId}/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    setSessionData(data);
                    setSessionState(data.state);

                    // Stop polling once active
                    if (data.state === 'active') {
                        stopStatusPolling();
                        // Fetch connection URL
                        fetchConnectionUrl();
                    }
                }
            } catch (error) {
                console.error('Status poll failed:', error);
            }
        }, 3000);
    };

    const stopStatusPolling = () => {
        if (statusPollInterval.current) {
            clearInterval(statusPollInterval.current);
            statusPollInterval.current = null;
        }
    };

    const fetchConnectionUrl = async () => {
        try {
            const response = await fetch(`${API_URL}/api/labs/${labId}/connection`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setSessionData(prev => prev ? { ...prev, guacamoleUrl: data.connectionUrl } : null);
            }
        } catch (error) {
            console.error('Failed to fetch connection URL:', error);
        }
    };

    const handleRetry = () => {
        setError(null);
        setSessionState('idle');
    };

    if (!lab) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition text-xs font-black uppercase tracking-widest border border-slate-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{lab.name}</h1>
                                <p className="text-primary text-[10px] font-black uppercase tracking-widest">{lab.type} Laboratory</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex flex-col items-end mr-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Logged in as</span>
                                <span className="text-xs font-black text-primary uppercase tracking-tight">{user?.name || 'Student'}</span>
                            </div>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-red-50 text-red-600 rounded-xl transition text-xs font-black uppercase tracking-widest border border-red-100"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                            <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>
                            {sessionState === 'idle' && (
                                <button
                                    onClick={startSession}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-2xl transition font-black text-sm shadow-lg shadow-primary/10 disabled:bg-primary/60 uppercase tracking-widest"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Launch Lab
                                </button>
                            )}
                            {(sessionState === 'active' || sessionState === 'paused') && (
                                <button
                                    onClick={stopSession}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition font-black text-sm shadow-lg shadow-red-900/10 disabled:bg-red-400 uppercase tracking-widest"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Square className="w-4 h-4 fill-current" />
                                    )}
                                    End Session
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Idle State - Lab Info */}
                {sessionState === 'idle' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                            <h2 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">Lab Description</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">{lab.description}</p>

                            <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Pre-installed Software</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {lab.software.map((sw, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                                    >
                                        <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                                        <span className="text-slate-700 text-xs font-black uppercase tracking-tight">{sw}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <h3 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">Resource Availability</h3>
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-4 border border-primary/20">
                                <Users className="w-10 h-10 text-primary" />
                            </div>
                            <div className="text-3xl font-black text-slate-900 mb-1">{lab.capacity}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Max Slots Available</div>
                            <p className="text-slate-500 text-xs font-medium leading-relaxed">
                                Click "Launch Lab" to start your virtual environment. If capacity is full, you'll be added to a queue.
                            </p>
                        </div>
                    </div>
                )}

                {/* Queued State */}
                {sessionState === 'queued' && sessionData && (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm max-w-2xl mx-auto">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6 border border-primary/20 shadow-sm">
                            <Clock className="w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">You're in the Queue</h2>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-10">All slots are currently full</p>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                <div className="text-4xl font-black text-primary mb-1">#{sessionData.queuePosition}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Position</div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                <div className="text-4xl font-black text-primary mb-1">
                                    {Math.ceil((sessionData.estimatedWaitTime || 0) / 60)}m
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait Time</div>
                            </div>
                        </div>

                        <p className="text-slate-400 text-xs mt-10 font-medium">
                            Automatic connection will occur when a slot becomes available.
                        </p>
                    </div>
                )}

                {/* Starting State */}
                {sessionState === 'starting' && (
                    <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center shadow-sm max-w-2xl mx-auto">
                        <Loader2 className="w-20 h-20 text-primary animate-spin mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Provisioning Environment</h2>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                            Installing software and configuring virtual desktop...
                        </p>
                        <div className="flex items-center justify-center gap-3 mt-10">
                            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}

                {/* Active State - Guacamole Iframe & Submission Sidebar */}
                {sessionState === 'active' && sessionData?.guacamoleUrl && (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
                        <div className={`flex-grow bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl transition-all duration-300 ${showSubmissions ? 'lg:w-2/3' : 'w-full'}`}>
                            <div className="bg-slate-900 p-3 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                                        <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        {lab.name} &bull; Virtual Session
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.open(NOUN_ELEARN_URL, '_blank')}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <FileCheck className="w-4 h-4" />
                                        {user?.role === 'facilitator' || user?.role === 'lab technician' ? 'Post Lab Activities' : 'Submit to NOUN'}
                                    </button>
                                    <button
                                        onClick={() => setShowSubmissions(!showSubmissions)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showSubmissions
                                            ? 'bg-primary text-white shadow-lg shadow-primary/40'
                                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        <ClipboardCheck className="w-4 h-4" />
                                        {showSubmissions ? 'Hide' : 'Submit'}
                                    </button>
                                    <button className="p-2 hover:bg-slate-800 rounded-xl transition">
                                        <Maximize2 className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                            <iframe
                                src={sessionData.guacamoleUrl}
                                className="w-full h-full bg-black border-none"
                                title="Lab Environment"
                                allow="clipboard-read; clipboard-write; fullscreen"
                            />
                        </div>

                        {showSubmissions && (
                            <div className="lg:w-1/3 bg-white rounded-3xl border border-slate-200 p-8 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-xl">
                                <h2 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-widest">
                                    <ClipboardCheck className="w-6 h-6 text-primary" />
                                    Assignment Center
                                </h2>

                                {assignments.length === 0 ? (
                                    <div className="space-y-6">
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Generic Lab Submission</p>
                                        </div>
                                        <AssignmentUpload
                                            labId={labId || ''}
                                            bookingId={activeBookingId || ''}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {assignments.map(assignment => (
                                            <div key={assignment._id} className="space-y-4">
                                                <div className="bg-slate-50 rounded-2xl p-5 border border-primary/20">
                                                    <h4 className="text-primary/80 font-black text-xs uppercase tracking-tight">{assignment.title}</h4>
                                                    <p className="text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed">{assignment.description}</p>
                                                    <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Due: {new Date(assignment.deadline).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                <AssignmentUpload
                                                    assignmentId={assignment._id}
                                                    labId={labId || ''}
                                                    bookingId={activeBookingId || ''}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Idle Warning State */}
                {sessionState === 'idle_warning' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 flex items-center gap-4 animate-pulse">
                        <AlertCircle className="w-8 h-8 text-amber-600" />
                        <div>
                            <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest">Inactivity Warning</h3>
                            <p className="text-amber-600 text-xs font-bold">
                                Your session will be suspended in 15 minutes due to inactivity.
                            </p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {sessionState === 'error' && error && (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm max-w-2xl mx-auto">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-3xl mb-6 border border-red-100">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">System Exception</h2>
                        <p className="text-slate-500 text-sm mb-10 leading-relaxed">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition font-black text-sm uppercase tracking-widest mx-auto"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Restart
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabEnvironment;
