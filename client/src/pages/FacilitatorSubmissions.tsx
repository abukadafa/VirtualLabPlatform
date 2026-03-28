import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LogOut,
    FileText,
    Award,
    TrendingUp,
    Search,
    X,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2,
    Edit,
    Download,
    CheckSquare,
    Square as SquareIcon,
    Database,
    ShieldCheck,
    ShieldAlert,
    ShieldQuestion,
    RotateCcw
} from 'lucide-react';
import { API_URL, NOUN_ELEARN_URL } from '../lib/config';

interface Submission {
    _id: string;
    student: { _id: string; name: string; email: string; programme: string };
    lab: { _id: string; name: string; type: string };
    title: string;
    description?: string;
    submittedAt: string;
    grade?: number;
    feedback?: string;
    gradingStatus: 'pending' | 'graded';
    files: Array<{ name: string; size: number; mimeType: string; storagePath: string }>;
    attemptNumber: number;
    labMetadata?: {
        instanceId: string;
        imageType: string;
        softwareVersions: Record<string, string>;
    };
    securityHooks?: {
        virusScanStatus: string;
        plagiarismScore?: number;
    };
}

interface Assignment {
    _id: string;
    title: string;
    course: { code: string; name: string };
    lab: { _id: string; name: string };
}

interface Analytics {
    totalSubmissions: number;
    pendingSubmissions: number;
    gradedSubmissions: number;
    gradeStats: {
        averageGrade: number;
        highestGrade: number;
        lowestGrade: number;
    };
    submissionsByLab: Array<{ _id: string; count: number; avgGrade: number }>;
    recentActivity: Array<{ _id: string; count: number }>;
}

const FacilitatorSubmissions: React.FC = () => {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'graded'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('all');
    const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<string>>(new Set());
    const [bulkDownloading, setBulkDownloading] = useState(false);

    // Grading Modal State
    const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gradingError, setGradingError] = useState<string | null>(null);
    const [gradingSuccess, setGradingSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user?.role !== 'facilitator' && user?.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        await Promise.all([
            fetchAssignments(),
            fetchSubmissions(),
            fetchAnalytics()
        ]);
        setIsLoading(false);
    };

    const fetchAssignments = async () => {
        try {
            // Simplified: Fetch all assignments for now. In real app, filter by facilitator enrollment.
            const response = await fetch(`${API_URL}/api/assignments/lab/all`, { // I need to make sure this endpoint exists or similar
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

    const fetchSubmissions = async () => {
        try {
            const endpoint = selectedAssignmentId === 'all'
                ? `${API_URL}/api/submissions/all`
                : `${API_URL}/api/submissions/assignment/${selectedAssignmentId}`;

            const response = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSubmissions(data);
            }
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await fetch(`${API_URL}/api/submissions/analytics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    };

    const handleGradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubmission) return;

        setIsSubmitting(true);
        setGradingError(null);

        try {
            const grade = parseFloat(gradeData.grade);
            if (isNaN(grade) || grade < 0 || grade > 100) {
                setGradingError('Grade must be between 0 and 100');
                setIsSubmitting(false);
                return;
            }

            const response = await fetch(
                `${API_URL}/api/submissions/grade/${selectedSubmission._id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        grade,
                        feedback: gradeData.feedback,
                    }),
                }
            );

            if (response.ok) {
                setGradingSuccess('Grade submitted successfully!');
                setTimeout(() => {
                    setIsGradingModalOpen(false);
                    setGradingSuccess(null);
                    setGradeData({ grade: '', feedback: '' });
                }, 1500);
                fetchSubmissions();
                fetchAnalytics();
            } else {
                const data = await response.json();
                setGradingError(data.message || 'Failed to submit grade');
            }
        } catch (error) {
            setGradingError('Connection error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = async (submissionId: string, fileIndex: number, fileName: string) => {
        try {
            const response = await fetch(`${API_URL}/api/submissions/download/${submissionId}/${fileIndex}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Download failed. You might not have permission.');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('An error occurred while downloading the file.');
        }
    };

    const handleBulkDownload = async () => {
        if (selectedSubmissionIds.size === 0) return;
        setBulkDownloading(true);
        try {
            const response = await fetch(`${API_URL}/api/submissions/bulk-download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    assignmentId: selectedAssignmentId,
                    submissionIds: Array.from(selectedSubmissionIds)
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Open all links or show a manifest
                data.files.forEach((file: any) => {
                    window.open(file.downloadUrl, '_blank');
                });
            }
        } catch (error) {
            console.error('Bulk download failed', error);
        } finally {
            setBulkDownloading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedSubmissionIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedSubmissionIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedSubmissionIds.size === filteredSubmissions.length) {
            setSelectedSubmissionIds(new Set());
        } else {
            setSelectedSubmissionIds(new Set(filteredSubmissions.map(s => s._id)));
        }
    };

    const openGradingModal = (submission: Submission) => {
        setSelectedSubmission(submission);
        setGradeData({
            grade: submission.grade?.toString() || '',
            feedback: submission.feedback || '',
        });
        setGradingError(null);
        setIsGradingModalOpen(true);
    };

    const filteredSubmissions = submissions.filter((sub) => {
        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'pending' && sub.gradingStatus === 'pending') ||
            (filterStatus === 'graded' && sub.gradingStatus === 'graded');

        const matchesSearch =
            searchTerm === '' ||
            sub.student.name.toLowerCase().includes(searchTerm.toLowerCase());
        // Laboratory name is handled by assignment selection but keeping for manual search

        return matchesStatus && matchesSearch;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
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
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FileText className="w-6 h-6 text-purple-400" />
                                Student Submissions
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Review and grade student work</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => window.open(NOUN_ELEARN_URL, '_blank')}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium shadow-lg shadow-purple-500/20"
                            >
                                <FileText className="w-4 h-4" />
                                E-Learn Portal
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm font-medium"
                            >
                                <TrendingUp className="w-4 h-4 text-purple-400" />
                                Back to Dashboard
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
                {/* Analytics Grid */}
                {analytics && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/80/20 rounded-lg">
                                    <FileText className="w-6 h-6 text-primary/60" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Total Submissions</p>
                                    <p className="text-2xl font-bold text-white">{analytics.totalSubmissions}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500/20 rounded-lg">
                                    <Clock className="w-6 h-6 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Pending Review</p>
                                    <p className="text-2xl font-bold text-white">{analytics.pendingSubmissions}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-primary/60" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Graded</p>
                                    <p className="text-2xl font-bold text-white">{analytics.gradedSubmissions}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Average Grade</p>
                                    <p className="text-2xl font-bold text-white">
                                        {analytics.gradeStats.averageGrade.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-1 w-full">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Assignment</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    value={selectedAssignmentId}
                                    onChange={(e) => {
                                        setSelectedAssignmentId(e.target.value);
                                        fetchSubmissions();
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white appearance-none focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="all">All Assignments</option>
                                    {assignments.map(a => (
                                        <option key={a._id} value={a._id}>{a.title} ({a.course.code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex-grow space-y-1 w-full">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Search Students</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition text-sm ${filterStatus === 'all'
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterStatus('pending')}
                                className={`px-4 py-2 rounded-lg font-medium transition text-sm ${filterStatus === 'pending'
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setFilterStatus('graded')}
                                className={`px-4 py-2 rounded-lg font-medium transition text-sm ${filterStatus === 'graded'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                Graded
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6 px-1">
                    <p className="text-slate-400 text-sm">
                        Showing <span className="text-white font-bold">{filteredSubmissions.length}</span> submissions
                    </p>
                    {selectedSubmissionIds.size > 0 && (
                        <button
                            onClick={handleBulkDownload}
                            disabled={bulkDownloading}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-xl shadow-primary/20 disabled:opacity-50"
                        >
                            {bulkDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download {selectedSubmissionIds.size} Submissions
                        </button>
                    )}
                </div>

                {/* Submissions Table */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
                    {filteredSubmissions.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No submissions found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700/50 border-b border-slate-700">
                                    <tr>
                                        <th className="px-4 py-4 w-10">
                                            <button onClick={toggleSelectAll}>
                                                {selectedSubmissionIds.size === filteredSubmissions.length && filteredSubmissions.length > 0
                                                    ? <CheckSquare className="w-5 h-5 text-primary/60" />
                                                    : <SquareIcon className="w-5 h-5 text-slate-600" />}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Student / Attempt
                                        </th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Task Info
                                        </th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Lab Environment
                                        </th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Submitted At
                                        </th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Security
                                        </th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredSubmissions.map((submission) => (
                                        <tr key={submission._id} className={`hover:bg-slate-700/30 transition-colors ${selectedSubmissionIds.has(submission._id) ? 'bg-primary/80/5' : ''}`}>
                                            <td className="px-4 py-4">
                                                <button onClick={() => toggleSelection(submission._id)}>
                                                    {selectedSubmissionIds.has(submission._id)
                                                        ? <CheckSquare className="w-5 h-5 text-primary/60" />
                                                        : <SquareIcon className="w-5 h-5 text-slate-700" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm text-white font-bold">{submission.student.name}</div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <RotateCcw className="w-3 h-3" /> Attempt #{submission.attemptNumber}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white font-medium">{submission.title || 'No Title'}</div>
                                                <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]" title={submission.description}>
                                                    {submission.description || 'No description'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-300 font-medium">{submission.lab.name}</div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                                    <Database className="w-3 h-3" /> {submission.labMetadata?.imageType || 'Standard Linux'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-400">{new Date(submission.submittedAt).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-slate-500">{new Date(submission.submittedAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {submission.securityHooks?.virusScanStatus === 'clean' ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                                            <ShieldCheck className="w-3.5 h-3.5" /> SECURE
                                                        </span>
                                                    ) : submission.securityHooks?.virusScanStatus === 'pending' ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400">
                                                            <ShieldQuestion className="w-3.5 h-3.5" /> SCANNING
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                                                            <ShieldAlert className="w-3.5 h-3.5" /> RISK
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[9px] text-slate-500 mt-0.5">MIME Verified</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {submission.gradingStatus === 'graded' ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">GRADED</span>
                                                        <span className="text-xs font-bold text-white ml-2">{submission.grade}%</span>
                                                    </div>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold border border-orange-500/20">PENDING</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => openGradingModal(submission)}
                                                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition border border-slate-600"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    {submission.gradingStatus === 'graded' ? 'Edit' : 'Evaluate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Grading Modal */}
            {isGradingModalOpen && selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => setIsGradingModalOpen(false)}
                    ></div>
                    <div className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Award className="w-5 h-5 text-purple-400" />
                                    Grade Submission
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    {selectedSubmission.student.name} • {selectedSubmission.lab.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsGradingModalOpen(false)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 bg-slate-900/50 border-b border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Submission Details</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs text-slate-400">Title:</span>
                                            <p className="text-sm font-bold text-white">{selectedSubmission.title || 'No Title'}</p>
                                        </div>
                                        {selectedSubmission.description && (
                                            <div>
                                                <span className="text-xs text-slate-400">Description:</span>
                                                <p className="text-sm text-slate-300 leading-relaxed">{selectedSubmission.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Attached Files</h3>
                                    <div className="space-y-2">
                                        {selectedSubmission.files.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-primary/60" />
                                                    <div>
                                                        <p className="text-xs font-bold text-white truncate max-w-[150px]">{file.name}</p>
                                                        <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(selectedSubmission._id, idx, file.name)}
                                                    className="p-2 hover:bg-primary/80/20 text-primary/60 rounded-lg transition"
                                                    title="Download File"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
                            {gradingError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {gradingError}
                                </div>
                            )}

                            {gradingSuccess && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    {gradingSuccess}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">
                                    Grade (0-100)
                                </label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={gradeData.grade}
                                    onChange={(e) => setGradeData({ ...gradeData, grade: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-white"
                                    placeholder="Enter grade"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">
                                    Feedback (Optional)
                                </label>
                                <textarea
                                    rows={4}
                                    value={gradeData.feedback}
                                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-white resize-none"
                                    placeholder="Provide feedback to the student..."
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsGradingModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-slate-700 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-xl font-bold transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Submit Grade
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

export default FacilitatorSubmissions;
