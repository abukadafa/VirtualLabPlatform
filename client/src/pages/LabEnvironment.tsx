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
    ClipboardCheck
} from 'lucide-react';
import AssignmentUpload from '../components/AssignmentUpload';
import { API_URL } from '../lib/config';

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
    const { token, user } = useAuth();

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

        // Map full programme names to lab types (consistent with backend)
        const typeMapping: { [key: string]: string } = {
            'Artificial Intelligence': 'AI',
            'Cybersecurity': 'Cybersecurity',
            'Management Information System': 'MIS'
        };

        try {
            // Check if facilitator is in the programme for this lab
            const isFacilitatorInProgramme = user.role === 'facilitator' && 
                lab && user.programmes?.some(p => typeMapping[p] === lab.type);

            if (user.role === 'admin' || isFacilitatorInProgramme) {
                return; // Admin and enrolled facilitators have full access
            }

            const response = await fetch(`${API_URL}/api/bookings/my-bookings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const bookings: any[] = await response.json();
                const activeBooking = bookings.find(b =>
                    b.lab._id === labId &&
                    ['confirmed', 'requested', 'granted', 'active'].includes(b.status)
                );

                if (activeBooking) {
                    setActiveBookingId(activeBooking._id);
                } else {
                    setError('Access Denied. You do not have a confirmed booking for this lab.');
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

                // Start polling if queued or starting
                if (data.state === 'queued' || data.state === 'starting') {
                    startStatusPolling();
                }
            } else if (response.status === 429) {
                // Rate limited
                setError('Too many requests. Please wait before starting another session.');
                setSessionState('error');
            } else {
                setError(data.message || 'Failed to start session');
                setSessionState('error');
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            setError('Network error. Please try again.');
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
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm font-medium"
                            >
                                <ArrowLeft className="w-4 h-4 text-white" />
                                Back to Dashboard
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{lab.name}</h1>
                                <p className="text-slate-400 text-sm">{lab.type} Laboratory</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {sessionState === 'idle' && (
                                <button
                                    onClick={startSession}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition font-semibold shadow-lg shadow-green-500/30 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Play className="w-5 h-5" />
                                    )}
                                    Launch Lab
                                </button>
                            )}
                            {(sessionState === 'active' || sessionState === 'paused') && (
                                <button
                                    onClick={stopSession}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Square className="w-4 h-4" />
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
                        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <h2 className="text-xl font-bold text-white mb-4">Lab Description</h2>
                            <p className="text-slate-300 mb-6">{lab.description}</p>

                            <h3 className="text-lg font-bold text-white mb-3">Pre-installed Software</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {lab.software.map((sw, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg"
                                    >
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span className="text-slate-300 text-sm">{sw}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <h3 className="text-lg font-bold text-white mb-4">Lab Capacity</h3>
                            <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg mb-4">
                                <Users className="w-8 h-8 text-blue-400" />
                                <div>
                                    <div className="text-2xl font-bold text-white">{lab.capacity}</div>
                                    <div className="text-sm text-slate-400">Max Concurrent Users</div>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm">
                                Click "Launch Lab" to start your virtual environment. If capacity is full, you'll be added to a queue.
                            </p>
                        </div>
                    </div>
                )}

                {/* Queued State */}
                {sessionState === 'queued' && sessionData && (
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-8 border border-slate-700/50 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
                            <Clock className="w-8 h-8 text-blue-400 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">You're in the Queue</h2>
                        <p className="text-slate-400 mb-6">All lab slots are currently full</p>

                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <div className="text-3xl font-bold text-blue-400">#{sessionData.queuePosition}</div>
                                <div className="text-sm text-slate-400 mt-1">Position in Queue</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <div className="text-3xl font-bold text-blue-400">
                                    {Math.ceil((sessionData.estimatedWaitTime || 0) / 60)}m
                                </div>
                                <div className="text-sm text-slate-400 mt-1">Estimated Wait</div>
                            </div>
                        </div>

                        <p className="text-slate-500 text-sm mt-6">
                            You'll be automatically connected when a slot becomes available
                        </p>
                    </div>
                )}

                {/* Starting State */}
                {sessionState === 'starting' && (
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-8 border border-slate-700/50 text-center">
                        <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Starting Your Lab Environment</h2>
                        <p className="text-slate-400">
                            Setting up your virtual desktop and installing software...
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}

                {/* Active State - Guacamole Iframe & Submission Sidebar */}
                {sessionState === 'active' && sessionData?.guacamoleUrl && (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
                        <div className={`flex-grow bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden transition-all duration-300 ${showSubmissions ? 'lg:w-2/3' : 'w-full'}`}>
                            <div className="bg-slate-900 p-3 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    </div>
                                    <span className="text-slate-400 text-sm font-medium">
                                        {lab.name} - Virtual Desktop
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowSubmissions(!showSubmissions)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showSubmissions
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        <ClipboardCheck className="w-4 h-4" />
                                        {showSubmissions ? 'Hide Submission' : 'Submit Work'}
                                    </button>
                                    <button className="p-1.5 hover:bg-slate-700 rounded transition">
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
                            <div className="lg:w-1/3 bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <ClipboardCheck className="w-6 h-6 text-blue-400" />
                                    Assignment Submissions
                                </h2>

                                {assignments.length === 0 ? (
                                    <div className="space-y-4">
                                        <div className="text-center py-8 bg-slate-900/30 rounded-2xl border border-slate-700/50 mb-4">
                                            <p className="text-slate-400 text-xs italic">Submit your general lab activity results below.</p>
                                        </div>
                                        <AssignmentUpload
                                            labId={labId || ''}
                                            bookingId={activeBookingId || ''}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {assignments.map(assignment => (
                                            <div key={assignment._id} className="space-y-4">
                                                <div className="bg-slate-900/50 rounded-xl p-4 border border-blue-500/20">
                                                    <h4 className="text-blue-400 font-bold">{assignment.title}</h4>
                                                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{assignment.description}</p>
                                                    <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-slate-500 uppercase">
                                                        <Clock className="w-3 h-3" />
                                                        Deadline: {new Date(assignment.deadline).toLocaleString()}
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
                    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6 mb-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-yellow-400" />
                            <div>
                                <h3 className="text-lg font-bold text-yellow-400">Idle Warning</h3>
                                <p className="text-slate-300">
                                    Your session will be paused in 15 minutes due to inactivity
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {sessionState === 'error' && error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-red-400 mb-2">Something Went Wrong</h2>
                        <p className="text-slate-300 mb-6">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition mx-auto"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabEnvironment;
