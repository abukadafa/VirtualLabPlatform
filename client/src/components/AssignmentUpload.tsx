import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Upload, File, CheckCircle, AlertCircle, Loader2, History, RotateCcw, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface AssignmentUploadProps {
    assignmentId: string;
    bookingId: string;
    onSuccess?: () => void;
}

interface SubmissionAttempt {
    _id: string;
    attemptNumber: number;
    submittedAt: string;
    status: string;
    files: Array<{ name: string; size: number }>;
    gradingStatus: string;
    grade?: number;
    feedback?: string;
    securityHooks?: {
        virusScanStatus: string;
        scanCompletedAt?: string;
    };
}

const AssignmentUpload: React.FC<AssignmentUploadProps> = ({ assignmentId, bookingId, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [history, setHistory] = useState<SubmissionAttempt[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const fetchHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/submissions/history/${assignmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        }
    }, [API_URL, assignmentId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setSuccess(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        // 0. Pre-upload Sanitization & Basic Validation
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9\-\._]/g, '_');
        const extension = '.' + sanitizedName.split('.').pop()?.toLowerCase();

        // Basic MIME Check
        const allowedExtensions = ['.pdf', '.zip', '.docx', '.py', '.ipynb'];
        if (!allowedExtensions.includes(extension)) {
            setError(`File type ${extension} is not supported.`);
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            const token = localStorage.getItem('token');

            // 1. Get signed URL with sanitized name
            const urlRes = await axios.post(`${API_URL}/submissions/upload-url`, {
                assignmentId,
                fileName: sanitizedName,
                contentType: file.type || 'application/octet-stream'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { uploadUrl, storageKey, fileName: backendSanitizedName } = urlRes.data;

            // 2. Upload directly to storage (S3 or Mock)
            await axios.put(uploadUrl, file, {
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setProgress(percentCompleted);
                }
            });

            // 3. Confirm submission with the sanitized name from backend
            await axios.post(`${API_URL}/submissions/confirm`, {
                assignmentId,
                bookingId,
                storageKey,
                fileName: backendSanitizedName,
                size: file.size,
                mimeType: file.type || 'application/octet-stream'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess(true);
            setFile(null);
            fetchHistory();
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-400" />
                    Submit Assignment
                </h3>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                    <History className="w-4 h-4" />
                    {showHistory ? 'Hide History' : 'View History'}
                </button>
            </div>

            {showHistory ? (
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {history.length === 0 ? (
                        <p className="text-center text-slate-500 py-4 italic">No previous attempts</p>
                    ) : (
                        history.map((attempt) => (
                            <div key={attempt._id} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">Attempt #{attempt.attemptNumber}</p>
                                    <p className="text-xs text-slate-400">{new Date(attempt.submittedAt).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-1">{attempt.files[0].name} ({(attempt.files[0].size / 1024 / 1024).toFixed(2)} MB)</p>

                                    <div className="flex items-center gap-2 mt-2">
                                        {attempt.securityHooks?.virusScanStatus === 'clean' ? (
                                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                                <ShieldCheck className="w-3 h-3" /> SCANNED
                                            </span>
                                        ) : attempt.securityHooks?.virusScanStatus === 'pending' ? (
                                            <span className="flex items-center gap-1 text-[9px] font-bold text-orange-400 animate-pulse">
                                                <Shield className="w-3 h-3" /> SCANNING...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[9px] font-bold text-red-400">
                                                <ShieldAlert className="w-3 h-3" /> SCAN FAILED
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${attempt.gradingStatus === 'graded' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        }`}>
                                        {attempt.gradingStatus === 'graded' ? `Graded: ${attempt.grade}%` : 'Pending'}
                                    </span>
                                    {attempt.status === 'late' && (
                                        <p className="text-[10px] text-red-400 mt-1 font-bold">LATE</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {!success ? (
                        <>
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                />
                                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 group-hover:border-slate-600 bg-slate-900/30 group-hover:bg-slate-900/50'
                                    }`}>
                                    {file ? (
                                        <>
                                            <File className="w-10 h-10 text-blue-400 mb-3" />
                                            <p className="text-sm font-medium text-white">{file.name}</p>
                                            <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-slate-500 mb-3 group-hover:text-slate-400 transition-colors" />
                                            <p className="text-sm font-medium text-slate-300">Click or drag to upload assignment</p>
                                            <p className="text-xs text-slate-500 mt-1">Accepted: .zip, .pdf, .docx, .py, .ipynb</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {uploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-slate-400">Uploading...</span>
                                        <span className="text-blue-400">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-blue-500 h-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 p-3 rounded-xl">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{error}</p>
                                    <button onClick={handleUpload} className="ml-auto flex items-center gap-1 hover:underline text-xs">
                                        <RotateCcw className="w-3 h-3" /> Retry
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processsing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Upload Final Submission
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in duration-300">
                            <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
                            <h4 className="text-lg font-bold text-white">Submission Successful!</h4>
                            <p className="text-sm text-slate-400 mt-1 max-w-[250px]">
                                Your assignment has been securely uploaded and recorded.
                            </p>
                            <button
                                onClick={() => setSuccess(false)}
                                className="mt-6 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Upload Another Version
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AssignmentUpload;
