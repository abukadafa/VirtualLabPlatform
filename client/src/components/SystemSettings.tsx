import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import RoleManagement from './RoleManagement';
import { Save, TestTube, CheckCircle, XCircle, Palette, Mail, Cloud, FileText, Shield } from 'lucide-react';
import { API_URL } from '../lib/config';

interface SystemSettings {
    general?: { appName: string; logoUrl: string; faviconUrl: string; primaryColor: string; secondaryColor: string };
    smtp?: any;
    s3?: any;
    notification_templates?: any;
}

const SystemSettings: React.FC = () => {
    const { token, refreshBranding } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 's3' | 'templates' | 'rbac'>('general');
    const [settings, setSettings] = useState<SystemSettings>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${API_URL}/api/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (key: string, value: any) => {
        setSaving(true);
        setTestResult(null);

        console.log('Saving settings:', { key, value });

        try {
            console.log('Using API URL:', API_URL);
            const response = await fetch(`${API_URL}/api/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ key, value })
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Server returned non-JSON response (check console)');
            }

            console.log('Save response:', { status: response.status, data });

            if (response.ok) {
                setTestResult({ type: 'success', message: 'Settings saved successfully!' });
                if (key === 'general') {
                    await refreshBranding();
                }
                fetchSettings();
            } else {
                setTestResult({ type: 'error', message: data.message || 'Failed to save settings' });
            }
        } catch (error: any) {
            console.error('Save error:', error);
            setTestResult({ type: 'error', message: 'Connection error: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const testSMTP = async () => {
        setTestResult(null);
        try {
            const response = await fetch(`${API_URL}/api/settings/test-smtp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ smtpConfig: settings.smtp })
            });

            const data = await response.json();
            setTestResult({
                type: response.ok ? 'success' : 'error',
                message: data.message
            });
        } catch (error: any) {
            setTestResult({ type: 'error', message: error.message });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex bg-slate-700/50 p-1 rounded-xl flex-wrap gap-1">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'general' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Palette className="w-4 h-4 inline mr-2" />
                    Branding
                </button>
                <button
                    onClick={() => setActiveTab('smtp')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'smtp' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Mail className="w-4 h-4 inline mr-2" />
                    SMTP
                </button>
                <button
                    onClick={() => setActiveTab('s3')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 's3' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Cloud className="w-4 h-4 inline mr-2" />
                    S3 Storage
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'templates' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Email Templates
                </button>
                <button
                    onClick={() => setActiveTab('rbac')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'rbac' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Shield className="w-4 h-4 inline mr-2" />
                    Roles & Permissions
                </button>
            </div>

            {/* Status Messages */}
            {testResult && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${testResult.type === 'success' ? 'bg-green-500/10 border border-green-500/50 text-green-400' : 'bg-red-500/10 border border-red-500/50 text-red-400'}`}>
                    {testResult.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    {testResult.message}
                </div>
            )}

            {/* Content */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold mb-4">App Branding</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">App Name</label>
                                <input
                                    type="text"
                                    value={settings.general?.appName || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            appName: e.target.value,
                                            logoUrl: settings.general?.logoUrl || '',
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Virtual Lab Platform"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Logo URL</label>
                                <input
                                    type="text"
                                    value={settings.general?.logoUrl || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            appName: settings.general?.appName || '',
                                            logoUrl: e.target.value,
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Favicon URL</label>
                                <input
                                    type="text"
                                    value={settings.general?.faviconUrl || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            appName: settings.general?.appName || '',
                                            logoUrl: settings.general?.logoUrl || '',
                                            faviconUrl: e.target.value,
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="https://example.com/favicon.ico"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Primary Color</label>
                                <input
                                    type="color"
                                    value={settings.general?.primaryColor || '#3b82f6'}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            appName: settings.general?.appName || '',
                                            logoUrl: settings.general?.logoUrl || '',
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: e.target.value,
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Secondary Color</label>
                                <input
                                    type="color"
                                    value={settings.general?.secondaryColor || '#8b5cf6'}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            appName: settings.general?.appName || '',
                                            logoUrl: settings.general?.logoUrl || '',
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: e.target.value
                                        }
                                    })}
                                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => saveSettings('general', settings.general)}
                            disabled={saving}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Branding
                        </button>
                    </div>
                )}

                {activeTab === 'smtp' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold mb-4">SMTP Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">SMTP Host</label>
                                <input
                                    type="text"
                                    value={settings.smtp?.host || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, host: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="smtp.gmail.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Port</label>
                                <input
                                    type="number"
                                    value={settings.smtp?.port || 587}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, port: parseInt(e.target.value) } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Username</label>
                                <input
                                    type="text"
                                    value={settings.smtp?.auth?.user || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, auth: { ...settings.smtp?.auth, user: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Password</label>
                                <input
                                    type="password"
                                    value={settings.smtp?.auth?.pass || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, auth: { ...settings.smtp?.auth, pass: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => saveSettings('smtp', settings.smtp)}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save SMTP
                            </button>
                            <button
                                onClick={testSMTP}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition flex items-center gap-2"
                            >
                                <TestTube className="w-4 h-4" />
                                Test Connection
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 's3' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold mb-4">S3 Storage Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Region</label>
                                <input
                                    type="text"
                                    value={settings.s3?.region || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, region: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="us-east-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Bucket Name</label>
                                <input
                                    type="text"
                                    value={settings.s3?.bucket || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, bucket: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Access Key ID</label>
                                <input
                                    type="text"
                                    value={settings.s3?.credentials?.accessKeyId || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, credentials: { ...settings.s3?.credentials, accessKeyId: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Secret Access Key</label>
                                <input
                                    type="password"
                                    value={settings.s3?.credentials?.secretAccessKey || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, credentials: { ...settings.s3?.credentials, secretAccessKey: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => saveSettings('s3', settings.s3)}
                            disabled={saving}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save S3 Config
                        </button>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold mb-4">Email Templates</h3>
                        <p className="text-sm text-slate-400">Configure email templates for system notifications. Use {'{{'} variableName {'}}'}  for dynamic content.</p>
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Welcome Email Subject</label>
                                <input
                                    type="text"
                                    value={settings.notification_templates?.welcome?.subject || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification_templates: {
                                            ...settings.notification_templates,
                                            welcome: { ...settings.notification_templates?.welcome, subject: e.target.value }
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Welcome to {{appName}}"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Welcome Email Body</label>
                                <textarea
                                    rows={4}
                                    value={settings.notification_templates?.welcome?.body || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification_templates: {
                                            ...settings.notification_templates,
                                            welcome: { ...settings.notification_templates?.welcome, body: e.target.value }
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Hello {{name}}, welcome to the platform!"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => saveSettings('notification_templates', settings.notification_templates)}
                            disabled={saving}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Templates
                        </button>
                    </div>
                )}

                {activeTab === 'rbac' && <RoleManagement />}
            </div>
        </div>
    );
};

export default SystemSettings;
