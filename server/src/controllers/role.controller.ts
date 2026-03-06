import { Request, Response } from 'express';
import Role from '../models/Role.model';

// Default permissions list
export const ALL_PERMISSIONS = [
    'view_dashboard',
    'manage_users',
    'manage_roles',
    'manage_labs',
    'view_labs',
    'book_labs',
    'request_lab_instance',
    'provision_labs',
    'view_submissions',
    'grade_submissions',
    'submit_assignments',
    'view_grades',
    'manage_settings',
    'view_feedback',
    'submit_feedback',
    'view_analytics'
];

export const getRoles = async (req: Request, res: Response) => {
    try {
        const roles = await Role.find();
        res.json(roles);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const createRole = async (req: Request, res: Response) => {
    try {
        const { name, description, permissions, color } = req.body;
        
        const existingRole = await Role.findOne({ name: name.toLowerCase() });
        if (existingRole) {
            return res.status(400).json({ message: 'Role already exists' });
        }

        const role = new Role({
            name: name.toLowerCase(),
            description,
            permissions,
            color,
            isSystemRole: false
        });

        await role.save();
        res.status(201).json(role);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const { description, permissions, color } = req.body;
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (description) role.description = description;
        if (permissions) role.permissions = permissions;
        if (color) role.color = color;

        await role.save();
        res.json(role);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (role.isSystemRole) {
            return res.status(400).json({ message: 'Cannot delete system roles' });
        }

        await Role.findByIdAndDelete(req.params.id);
        res.json({ message: 'Role deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getPermissions = (req: Request, res: Response) => {
    res.json(ALL_PERMISSIONS);
};

export const seedRoles = async (req: Request, res: Response) => {
    try {
        const defaultRoles = [
            {
                name: 'admin',
                description: 'Full system access with all administrative privileges',
                isSystemRole: true,
                color: 'from-red-600 to-orange-600',
                permissions: ALL_PERMISSIONS
            },
            {
                name: 'facilitator',
                description: 'Instructor access for assigned programmes',
                isSystemRole: true,
                color: 'from-blue-600 to-purple-600',
                permissions: [
                    'view_dashboard',
                    'view_labs',
                    'view_submissions',
                    'grade_submissions',
                    'view_analytics',
                    'view_feedback',
                    'submit_feedback'
                ]
            },
            {
                name: 'student',
                description: 'Standard user access for learning activities',
                isSystemRole: true,
                color: 'from-green-600 to-teal-600',
                permissions: [
                    'view_dashboard',
                    'view_labs',
                    'book_labs',
                    'request_lab_instance',
                    'submit_assignments',
                    'view_grades',
                    'submit_feedback'
                ]
            }
        ];

        for (const roleData of defaultRoles) {
            await Role.findOneAndUpdate(
                { name: roleData.name },
                roleData,
                { upsert: true, new: true }
            );
        }

        res.json({ message: 'Roles seeded successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error seeding roles', error: error.message });
    }
};
