import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Info, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/config';

interface Role {
    _id: string;
    name: string;
    description: string;
    permissions: string[];
    isSystemRole: boolean;
    color: string;
}

const RoleManagement: React.FC = () => {
    const { token, user } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const isAdmin = user?.role === 'admin';

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[],
        color: 'from-blue-600 to-indigo-600'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                fetch(`${API_URL}/api/roles`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/roles/permissions`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (rolesRes.ok && permsRes.ok) {
                const rolesData = await rolesRes.json();
                const permsData = await permsRes.json();
                
                if (rolesData.length === 0 && isAdmin) {
                    // Automatically seed if no roles found - only for admins
                    await fetch(`${API_URL}/api/roles/seed`, { 
                        method: 'POST', 
                        headers: { Authorization: `Bearer ${token}` } 
                    });
                    fetchData();
                    return;
                }
                
                setRoles(rolesData);
                setAvailablePermissions(permsData);
            }
        } catch (err) {
            setError('Failed to fetch roles and permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;
        setError(null);
        setSuccess(null);

        const url = editingRole 
            ? `${API_URL}/api/roles/${editingRole._id}` 
            : `${API_URL}/api/roles`;
        
        const method = editingRole ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSuccess(`Role ${editingRole ? 'updated' : 'created'} successfully`);
                setIsModalOpen(false);
                setEditingRole(null);
                setFormData({ name: '', description: '', permissions: [], color: 'from-blue-600 to-indigo-600' });
                fetchData();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await response.json();
                setError(data.message || 'Action failed');
            }
        } catch (err) {
            setError('Connection error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) return;
        if (!window.confirm('Are you sure you want to delete this role?')) return;
        
        try {
            const response = await fetch(`${API_URL}/api/roles/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setSuccess('Role deleted');
                fetchData();
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            setError('Failed to delete role');
        }
    };

    const togglePermission = (perm: string) => {
        if (!isAdmin) return;
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    if (loading) return <div className="text-center py-12 text-slate-400">Loading roles...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 flex-1 mr-4">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-300">
                        <p className="font-bold mb-1">Role-Based Access Control (RBAC)</p>
                        <p>Define custom roles and assign granular permissions. Note: System roles cannot be deleted.</p>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setEditingRole(null);
                            setFormData({ name: '', description: '', permissions: [], color: 'from-blue-600 to-indigo-600' });
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition h-fit"
                    >
                        <Plus className="w-4 h-4" />
                        Create Role
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
                    <CheckCircle className="w-5 h-5" />
                    {success}
                </div>
            )}

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                    <div key={role._id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col">
                        <div className={`h-2 bg-gradient-to-r ${role.color}`}></div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center`}>
                                    <Shield className="w-5 h-5 text-blue-400" />
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingRole(role);
                                                setFormData({
                                                    name: role.name,
                                                    description: role.description,
                                                    permissions: role.permissions,
                                                    color: role.color
                                                });
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {!role.isSystemRole && (
                                            <button
                                                onClick={() => handleDelete(role._id)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-bold capitalize mb-1 flex items-center gap-2">
                                {role.name}
                                {role.isSystemRole && <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded uppercase">System</span>}
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">{role.description}</p>

                            <div className="mt-auto space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                                    <span>Permissions</span>
                                    <span>{role.permissions.length} active</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {role.permissions.slice(0, 5).map((perm, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-slate-700/50 border border-slate-600/50 rounded text-[10px] text-slate-300">
                                            {perm.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                    {role.permissions.length > 5 && (
                                        <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-[10px] font-bold">
                                            +{role.permissions.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {editingRole ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Role Name</label>
                                    <input
                                        required
                                        disabled={!!editingRole && editingRole.isSystemRole}
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                                        placeholder="e.g. content_manager"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="What can this role do?"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase flex justify-between">
                                    <span>Assign Permissions</span>
                                    <span className="text-blue-400">{formData.permissions.length} Selected</span>
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                                    {availablePermissions.map(perm => (
                                        <button
                                            key={perm}
                                            type="button"
                                            onClick={() => togglePermission(perm)}
                                            className={`flex items-center gap-2 p-2 rounded-lg text-xs transition border ${formData.permissions.includes(perm)
                                                ? 'bg-blue-600/20 border-blue-600 text-blue-300'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                        >
                                            {formData.permissions.includes(perm) ? (
                                                <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                                            ) : (
                                                <div className="w-3.5 h-3.5 border border-slate-500 rounded-full"></div>
                                            )}
                                            {perm.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    {editingRole ? 'Update Role' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;
