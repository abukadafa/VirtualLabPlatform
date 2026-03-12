import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle, Info } from 'lucide-react';

interface RolePermission {
    role: string;
    description: string;
    permissions: string[];
    color: string;
}

const RoleManagement: React.FC = () => {
    const [roles] = useState<RolePermission[]>([
        {
            role: 'admin',
            description: 'Full system access with all administrative privileges',
            permissions: [
                'Manage all users and roles',
                'Configure system settings (SMTP, S3, branding)',
                'Access all labs and bookings',
                'View and grade all submissions',
                'Manage email templates',
                'Approve/reject booking requests',
                'View analytics and reports'
            ],
            color: 'from-red-600 to-orange-600'
        },
        {
            role: 'facilitator',
            description: 'Instructor access for assigned programmes',
            permissions: [
                'View labs for enrolled programmes',
                'Access submissions from enrolled students',
                'Grade and provide feedback',
                'View programme-specific analytics',
                'Manage assignments for enrolled programmes'
            ],
            color: 'from-blue-600 to-purple-600'
        },
        {
            role: 'student',
            description: 'Standard user access for learning activities',
            permissions: [
                'Request lab bookings',
                'Access approved lab sessions',
                'Submit assignments',
                'View own grades and feedback',
                'View enrolled programme labs'
            ],
            color: 'from-green-600 to-teal-600'
        }
    ]);

    const [routeProtection] = useState([
        { path: '/admin/management', allowedRoles: ['admin'], protected: true },
        { path: '/facilitator/submissions', allowedRoles: ['facilitator', 'admin'], protected: true },
        { path: '/dashboard', allowedRoles: ['student', 'facilitator', 'admin'], protected: true },
        { path: '/lab/:labId', allowedRoles: ['student', 'facilitator', 'admin'], protected: true },
        { path: '/login', allowedRoles: [], protected: false },
        { path: '/reset-password/:token', allowedRoles: [], protected: false }
    ]);

    return (
        <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                    <p className="font-bold mb-1">Role-Based Access Control (RBAC)</p>
                    <p>The system enforces role-based permissions on both frontend routes and backend API endpoints. User roles are assigned during registration and can be updated by administrators.</p>
                </div>
            </div>

            {/* Roles Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {roles.map((roleInfo) => (
                    <div key={roleInfo.role} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                        <div className={`w-12 h-12 bg-gradient-to-br ${roleInfo.color} rounded-xl flex items-center justify-center mb-4`}>
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold capitalize mb-2">{roleInfo.role}</h3>
                        <p className="text-sm text-slate-400 mb-4">{roleInfo.description}</p>
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase">Permissions</p>
                            {roleInfo.permissions.map((permission, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <span>{permission}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Route Protection */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    Route Protection
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">Route</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">Allowed Roles</th>
                                <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase">Protected</th>
                            </tr>
                        </thead>
                        <tbody>
                            {routeProtection.map((route, idx) => (
                                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                                    <td className="py-3 px-4 font-mono text-sm text-slate-300">{route.path}</td>
                                    <td className="py-3 px-4">
                                        {route.allowedRoles.length > 0 ? (
                                            <div className="flex gap-2 flex-wrap">
                                                {route.allowedRoles.map((role) => (
                                                    <span key={role} className="px-2 py-1 bg-blue-600/20 border border-blue-600/50 rounded text-xs text-blue-300 capitalize">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-500 text-sm">Public</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {route.protected ? (
                                            <CheckCircle className="w-5 h-5 text-green-400 inline" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-slate-500 inline" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Backend API Protection */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    Backend API Protection
                </h3>
                <p className="text-sm text-slate-400 mb-4">All API endpoints are protected by authentication middleware. Admin-only endpoints include:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        '/api/settings (GET, PUT)',
                        '/api/settings/test-smtp (POST)',
                        '/api/settings/test-s3 (POST)',
                        '/api/users (GET, POST, PUT, DELETE)',
                        '/api/bookings/:id/approve (POST)'
                    ].map((endpoint, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                            <Shield className="w-4 h-4 text-red-400" />
                            <code className="text-sm text-slate-300">{endpoint}</code>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RoleManagement;
