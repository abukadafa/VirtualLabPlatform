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
    Edit
} from 'lucide-react';

interface Submission {
    _id: string;
    student: { _id: string; name: string; email: string; programme: string };
    lab: { _id: string; name: string; type: string };
    submittedAt: string;
    grade?: number;
    feedback?: string;
    status: 'pending' | 'graded';
    files: Array<{ name: string; size: number; mimeType: string }>;
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

    // Grading Modal State
    const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gradingError, setGradingError] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        if (user?.role !== 'facilitator' && user?.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        fetchSubmissions();
        fetchAnalytics();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const response = await fetch(`${API_URL}/api/submissions/all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSubmissions(data);
            }
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
        } finally {
            setIsLoading(false);
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
                setIsGradingModalOpen(false);
                setGradeData({ grade: '', feedback: '' });
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
            (filterStatus === 'pending' && sub.status === 'pending') ||
            (filterStatus === 'graded' && sub.status === 'graded');

        const matchesSearch =
            searchTerm === '' ||
            sub.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.lab.name.toLowerCase().includes(searchTerm.toLowerCase());

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
                                onClick={() => navigate('/dashboard')}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
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
                                <div className="p-3 bg-blue-500/20 rounded-lg">
                                    <FileText className="w-6 h-6 text-blue-400" />
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
                                <div className="p-3 bg-green-500/20 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-400" />
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
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by student name or lab..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterStatus('pending')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'pending'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setFilterStatus('graded')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'graded'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                Graded
                            </button>
                        </div>
                    </div>
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
                                <thead className="bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                            Student
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                            Lab
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                            Submitted
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                            Grade
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
                                    {filteredSubmissions.map((submission) => (
                                        <tr key={submission._id} className="hover:bg-slate-700/20">
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white font-medium">
                                                    {submission.student.name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {submission.student.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white">{submission.lab.name}</div>
                                                <div className="text-xs text-slate-400">{submission.lab.type}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {new Date(submission.submittedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {submission.grade !== undefined ? (
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${submission.grade >= 70
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : submission.grade >= 50
                                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                                : 'bg-red-500/20 text-red-400'
                                                            }`}
                                                    >
                                                        {submission.grade}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${submission.status === 'pending'
                                                        ? 'bg-orange-500/20 text-orange-400'
                                                        : 'bg-green-500/20 text-green-400'
                                                        }`}
                                                >
                                                    {submission.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => openGradingModal(submission)}
                                                    className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    {submission.status === 'pending' ? 'Grade' : 'Edit'}
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

                        <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
                            {gradingError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {gradingError}
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
