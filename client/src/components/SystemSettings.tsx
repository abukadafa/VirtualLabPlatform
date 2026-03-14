import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import RoleManagement from './RoleManagement';
import { Save, TestTube, CheckCircle, XCircle, Palette, Mail, Cloud, FileText, Shield, Server, Network } from 'lucide-react';
import { API_URL } from '../lib/config';

interface SystemSettings {
    general?: { 
        appName: string; 
        logoUrl: string; 
        secondaryLogoUrl: string;
        faviconUrl: string; 
        primaryColor: string; 
        secondaryColor: string 
    };
    smtp?: any;
    s3?: any;
    notification_templates?: any;
    proxmox?: {
        apiUrl?: string;
        nodeName?: string;
        realm?: string;
        apiTokenId?: string;
        apiTokenSecret?: string;
        storage?: string;
        networkBridge?: string;
        defaultTemplate?: string;
        vpnRequired?: boolean;
        terminalMode?: 'vpn_gateway' | 'direct_host' | 'bastion';
        cleanupGraceDays?: number;
        allowedTemplates?: string;
        notes?: string;
        vpn?: {
            endpoint?: string;
            listenPort?: string;
            subnet?: string;
            clientAddress?: string;
            gatewayAddress?: string;
            privateKey?: string;
            presharedKey?: string;
            appServerPublicKey?: string;
            gatewayPublicKey?: string;
        };
    };
}

const SystemSettings: React.FC = () => {
    const { token, user, refreshBranding } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 's3' | 'proxmox' | 'templates' | 'rbac'>('general');
    const [settings, setSettings] = useState<SystemSettings>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const isAdmin = user?.role === 'admin';

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
        if (!isAdmin) return;
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
        if (!isAdmin) return;
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

    const vpn = settings.proxmox?.vpn || {};
    const wireGuardAppConfig = `[Interface]
Address = ${vpn.clientAddress || '10.99.0.2/32'}
PrivateKey = ${vpn.privateKey || '<app-server-private-key>'}
DNS = 1.1.1.1

[Peer]
PublicKey = ${vpn.gatewayPublicKey || '<proxmox-gateway-public-key>'}
PresharedKey = ${vpn.presharedKey || '<optional-preshared-key>'}
AllowedIPs = ${vpn.subnet || '10.50.0.0/24'}, ${vpn.gatewayAddress || '10.99.0.1/32'}
Endpoint = ${vpn.endpoint || 'proxmox.example.com:51820'}
PersistentKeepalive = 25`;

    const wireGuardGatewayConfig = `[Interface]
Address = ${vpn.gatewayAddress || '10.99.0.1/24'}
ListenPort = ${vpn.listenPort || '51820'}
PrivateKey = <generate-on-proxmox-gateway>

[Peer]
PublicKey = ${vpn.appServerPublicKey || '<app-server-public-key>'}
PresharedKey = ${vpn.presharedKey || '<optional-preshared-key>'}
AllowedIPs = ${vpn.clientAddress || '10.99.0.2/32'}`;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/80"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex bg-slate-700/50 p-1 rounded-xl flex-wrap gap-1">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'general' ? 'bg-primary shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Palette className="w-4 h-4 inline mr-2" />
                    Branding
                </button>
                <button
                    onClick={() => setActiveTab('smtp')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'smtp' ? 'bg-primary shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Mail className="w-4 h-4 inline mr-2" />
                    SMTP
                </button>
                <button
                    onClick={() => setActiveTab('s3')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 's3' ? 'bg-primary shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Cloud className="w-4 h-4 inline mr-2" />
                    S3 Storage
                </button>
                <button
                    onClick={() => setActiveTab('proxmox')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'proxmox' ? 'bg-primary shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Server className="w-4 h-4 inline mr-2" />
                    Proxmox & VPN
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'templates' ? 'bg-primary shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Email Templates
                </button>
                <button
                    onClick={() => setActiveTab('rbac')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'rbac' ? 'bg-primary shadow-lg' : 'hover:bg-slate-700'}`}
                >
                    <Shield className="w-4 h-4 inline mr-2" />
                    Roles & Permissions
                </button>
            </div>

            {/* Status Messages */}
            {testResult && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${testResult.type === 'success' ? 'bg-primary/10 border border-primary/50 text-primary/60' : 'bg-red-500/10 border border-red-500/50 text-red-400'}`}>
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
                                    disabled={!isAdmin}
                                    value={settings.general?.appName || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            appName: e.target.value,
                                            logoUrl: settings.general?.logoUrl || '',
                                            secondaryLogoUrl: settings.general?.secondaryLogoUrl || '',
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="ACETEL Virtual Laboratory Platform"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Primary Logo URL</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.general?.logoUrl || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            ...settings.general,
                                            appName: settings.general?.appName || '',
                                            logoUrl: e.target.value,
                                            secondaryLogoUrl: settings.general?.secondaryLogoUrl || '',
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="https://upload.wikimedia.org/wikipedia/commons/a/a1/National_Open_University_of_Nigeria_Logo.png"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Secondary Logo URL</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.general?.secondaryLogoUrl || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            ...settings.general,
                                            appName: settings.general?.appName || '',
                                            logoUrl: settings.general?.logoUrl || '',
                                            secondaryLogoUrl: e.target.value,
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="https://acetel.nou.edu.ng/wp-content/uploads/2019/06/acetel-logo.png"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Favicon URL</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.general?.faviconUrl || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            ...settings.general,
                                            appName: settings.general?.appName || '',
                                            logoUrl: settings.general?.logoUrl || '',
                                            secondaryLogoUrl: settings.general?.secondaryLogoUrl || '',
                                            faviconUrl: e.target.value,
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="https://example.com/favicon.ico"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Primary Color</label>
                                <input
                                    type="color"
                                    disabled={!isAdmin}
                                    value={settings.general?.primaryColor || '#3b82f6'}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            ...settings.general,
                                            appName: settings.general?.appName || '',
                                            logoUrl: settings.general?.logoUrl || '',
                                            secondaryLogoUrl: settings.general?.secondaryLogoUrl || '',
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: e.target.value,
                                            secondaryColor: settings.general?.secondaryColor || '#8b5cf6'
                                        }
                                    })}
                                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Secondary Color</label>
                                <input
                                    type="color"
                                    disabled={!isAdmin}
                                    value={settings.general?.secondaryColor || '#8b5cf6'}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        general: {
                                            ...settings.general,
                                            appName: settings.general?.appName || '',
                                            logoUrl: settings.general?.logoUrl || '',
                                            secondaryLogoUrl: settings.general?.secondaryLogoUrl || '',
                                            faviconUrl: settings.general?.faviconUrl || '',
                                            primaryColor: settings.general?.primaryColor || '#3b82f6',
                                            secondaryColor: e.target.value
                                        }
                                    })}
                                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => saveSettings('general', settings.general)}
                                disabled={saving}
                                className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save Branding
                            </button>
                        )}
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
                                    disabled={!isAdmin}
                                    value={settings.smtp?.host || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, host: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="smtp.gmail.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Port</label>
                                <input
                                    type="number"
                                    disabled={!isAdmin}
                                    value={settings.smtp?.port || 587}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, port: parseInt(e.target.value) } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Username</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.smtp?.auth?.user || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, auth: { ...settings.smtp?.auth, user: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Password</label>
                                <input
                                    type="password"
                                    disabled={!isAdmin}
                                    value={settings.smtp?.auth?.pass || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, auth: { ...settings.smtp?.auth, pass: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => saveSettings('smtp', settings.smtp)}
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save SMTP
                                </button>
                                <button
                                    onClick={testSMTP}
                                    className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl font-bold transition flex items-center gap-2"
                                >
                                    <TestTube className="w-4 h-4" />
                                    Test Connection
                                </button>
                            </div>
                        )}
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
                                    disabled={!isAdmin}
                                    value={settings.s3?.region || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, region: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="us-east-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Bucket Name</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.s3?.bucket || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, bucket: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Access Key ID</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.s3?.credentials?.accessKeyId || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, credentials: { ...settings.s3?.credentials, accessKeyId: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Secret Access Key</label>
                                <input
                                    type="password"
                                    disabled={!isAdmin}
                                    value={settings.s3?.credentials?.secretAccessKey || ''}
                                    onChange={(e) => setSettings({ ...settings, s3: { ...settings.s3, credentials: { ...settings.s3?.credentials, secretAccessKey: e.target.value } } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => saveSettings('s3', settings.s3)}
                                disabled={saving}
                                className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save S3 Config
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'proxmox' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold mb-2">Proxmox Provisioning</h3>
                            <p className="text-sm text-slate-400">
                                Configure the Proxmox API, the VM network path, and the browser-terminal connectivity model for local lab provisioning.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Proxmox API URL</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.apiUrl || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, apiUrl: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="https://proxmox.example.com:8006/api2/json"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Node Name</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.nodeName || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, nodeName: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="pve"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Realm</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.realm || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, realm: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="pam"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">API Token ID</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.apiTokenId || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, apiTokenId: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="lab-automation@pve!booking-system"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">API Token Secret</label>
                                <input
                                    type="password"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.apiTokenSecret || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, apiTokenSecret: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="Stored securely"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Storage</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.storage || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, storage: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="local-lvm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Network Bridge</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.networkBridge || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, networkBridge: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="vmbr0"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Default Template</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.defaultTemplate || ''}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, defaultTemplate: e.target.value } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="ubuntu-22-04-base"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Cleanup Grace Days</label>
                                <input
                                    type="number"
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.cleanupGraceDays || 0}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, cleanupGraceDays: parseInt(e.target.value || '0', 10) } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Terminal Mode</label>
                                <select
                                    disabled={!isAdmin}
                                    value={settings.proxmox?.terminalMode || 'vpn_gateway'}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, terminalMode: e.target.value as 'vpn_gateway' | 'direct_host' | 'bastion' } })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                >
                                    <option value="vpn_gateway">VPN Gateway</option>
                                    <option value="direct_host">Direct Host Routing</option>
                                    <option value="bastion">Bastion Host</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                                <input
                                    id="vpnRequired"
                                    type="checkbox"
                                    disabled={!isAdmin}
                                    checked={settings.proxmox?.vpnRequired ?? true}
                                    onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, vpnRequired: e.target.checked } })}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                                />
                                <label htmlFor="vpnRequired" className="text-sm font-medium text-slate-200">
                                    Use VPN/private routing for browser terminal access
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Allowed Templates</label>
                            <textarea
                                disabled={!isAdmin}
                                value={settings.proxmox?.allowedTemplates || ''}
                                onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, allowedTemplates: e.target.value } })}
                                className="w-full min-h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                placeholder="ubuntu-22-04-base&#10;kali-linux-base&#10;debian-12-lab"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Provisioning Notes</label>
                            <textarea
                                disabled={!isAdmin}
                                value={settings.proxmox?.notes || ''}
                                onChange={(e) => setSettings({ ...settings, proxmox: { ...settings.proxmox, notes: e.target.value } })}
                                className="w-full min-h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                placeholder="Technician guidance, naming rules, VLAN notes, or cleanup expectations."
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <Network className="w-5 h-5 text-primary" />
                                <h4 className="font-bold text-slate-100">VPN / Network Guidance</h4>
                            </div>
                            <p className="text-sm text-slate-300">
                                A public Proxmox host IP does not automatically give every VM a public IP. For in-browser SSH, the safer model is to keep VMs on a private subnet and let this platform reach them through a VPN, routed private link, or bastion.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">VPN Endpoint</label>
                                    <input
                                        type="text"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.endpoint || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, endpoint: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="vpn.example.com:51820"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">VPN Listen Port</label>
                                    <input
                                        type="text"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.listenPort || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, listenPort: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="51820"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Private Subnet</label>
                                    <input
                                        type="text"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.subnet || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, subnet: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="10.50.0.0/24"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Gateway Client Address</label>
                                    <input
                                        type="text"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.clientAddress || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, clientAddress: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="10.50.0.2/32"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Gateway Tunnel Address</label>
                                    <input
                                        type="text"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.gatewayAddress || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, gatewayAddress: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="10.99.0.1/24"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">VPN Private Key</label>
                                    <input
                                        type="password"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.privateKey || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, privateKey: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="Stored securely"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">App Server Public Key</label>
                                    <input
                                        type="text"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.appServerPublicKey || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, appServerPublicKey: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="Paste app server public key"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Gateway Public Key</label>
                                    <input
                                        type="text"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.gatewayPublicKey || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, gatewayPublicKey: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="Paste Proxmox gateway public key"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">VPN Preshared Key</label>
                                    <input
                                        type="password"
                                        disabled={!isAdmin}
                                        value={settings.proxmox?.vpn?.presharedKey || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            proxmox: {
                                                ...settings.proxmox,
                                                vpn: { ...settings.proxmox?.vpn, presharedKey: e.target.value }
                                            }
                                        })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                        placeholder="Optional depending on VPN design"
                                    />
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300 space-y-2">
                                <p>Recommended deployment:</p>
                                <p>1. Keep student VMs on a private bridge or VLAN in Proxmox.</p>
                                <p>2. Give the web app or terminal gateway private connectivity to that network.</p>
                                <p>3. Render SSH in the browser using `xterm.js` and a backend WebSocket-to-SSH bridge.</p>
                                <p>4. Only expose the main web app publicly; do not expose each student VM directly unless strictly required.</p>
                            </div>
                            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300 space-y-3">
                                <p>WireGuard setup steps:</p>
                                <p>1. Generate a key pair on the app server and paste the private key here and the public key into the field below.</p>
                                <p>2. Generate a key pair on the Proxmox-side gateway and paste only the gateway public key here.</p>
                                <p>3. Install WireGuard on both ends and use the generated configs below.</p>
                                <p>4. Make sure the gateway can route to the VM subnet and IP forwarding is enabled.</p>
                                <p>5. On the app server, test SSH reachability to a VM private IP before using the browser terminal.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">App Server WireGuard Config</label>
                                    <textarea
                                        readOnly
                                        value={wireGuardAppConfig}
                                        className="w-full min-h-52 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Proxmox Gateway WireGuard Config</label>
                                    <textarea
                                        readOnly
                                        value={wireGuardGatewayConfig}
                                        className="w-full min-h-44 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <button
                                onClick={() => saveSettings('proxmox', settings.proxmox)}
                                disabled={saving}
                                className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save Proxmox Settings
                            </button>
                        )}
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
                                    disabled={!isAdmin}
                                    value={settings.notification_templates?.welcome?.subject || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification_templates: {
                                            ...settings.notification_templates,
                                            welcome: { ...settings.notification_templates?.welcome, subject: e.target.value }
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none disabled:opacity-50"
                                    placeholder="Welcome to {{appName}}"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Welcome Email Body</label>
                                <textarea
                                    rows={4}
                                    disabled={!isAdmin}
                                    value={settings.notification_templates?.welcome?.body || ''}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification_templates: {
                                            ...settings.notification_templates,
                                            welcome: { ...settings.notification_templates?.welcome, body: e.target.value }
                                        }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/80 outline-none resize-none disabled:opacity-50"
                                    placeholder="Hello {{name}}, welcome to the platform!"
                                />
                            </div>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => saveSettings('notification_templates', settings.notification_templates)}
                                disabled={saving}
                                className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl font-bold transition flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save Templates
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'rbac' && <RoleManagement />}
            </div>
        </div>
    );
};

export default SystemSettings;
