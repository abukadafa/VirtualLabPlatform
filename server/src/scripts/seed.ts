import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lab from '../models/Lab.model';
import User from '../models/User.model';
import SystemConfig from '../models/SystemConfig.model';
import Role from '../models/Role.model';

dotenv.config();

const labs = [
    {
        name: 'Artificial Intelligence Lab',
        type: 'AI',
        description: 'Advanced AI and Machine Learning laboratory with pre-configured environments for deep learning, NLP, and computer vision',
        software: ['Python 3', 'Jupyter Lab', 'TensorFlow', 'PyTorch'],
        capacity: 50,
        status: 'active',
    },
    {
        name: 'Cybersecurity Lab',
        type: 'Cybersecurity',
        description: 'Hands-on cybersecurity environment for ethical hacking and security analysis',
        software: ['Kali Linux', 'Wireshark', 'Metasploit', 'Nmap'],
        capacity: 40,
        status: 'active',
    },
    {
        name: 'Management Information System Lab',
        type: 'MIS',
        description: 'Laboratory for database management, business intelligence, and data analytics',
        software: ['PostgreSQL', 'RStudio', 'Metabase', 'Python'],
        capacity: 45,
        status: 'active',
    },
];

const emailTemplates = {
    'welcome': {
        subject: 'Welcome to Virtual Lab Platform',
        body: 'Hello {{name}},\n\nWelcome to the platform. Your account is now active.'
    },
    'password_reset': {
        subject: 'Password Reset Request',
        body: 'Hello {{name}},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n{{resetLink}}\n\nThis link will expire in 1 hour.'
    },
    'submission_confirmation': {
        subject: 'Assignment Submission Received',
        body: 'Hello {{name}},\n\nYour submission for "{{assignmentName}}" has been received. Attempt #{{attempt}}.'
    },
    'booking_confirmed': {
        subject: 'Lab Booking Confirmed: {{labName}}',
        body: 'Hello {{name}},\n\nYour booking for "{{labName}}" from {{startTime}} to {{endTime}} has been CONFIRMED.\n\nAdmin Note: {{adminNote}}\n\nYou can now access the lab during your scheduled time.'
    },
    'booking_cancelled': {
        subject: 'Lab Booking Cancelled/Denied: {{labName}}',
        body: 'Hello {{name}},\n\nYour booking for "{{labName}}" scheduled for {{startTime}} has been CANCELLED or DENIED.\n\nReason/Note: {{adminNote}}'
    },
    'submission_graded': {
        subject: 'Assignment Graded: {{assignmentName}}',
        body: 'Hello {{name}},\n\nYour submission for "{{assignmentName}}" has been graded.\n\nGrade: {{grade}}\nFeedback: {{feedback}}'
    }
};

const defaultRoles = [
    {
        name: 'admin',
        description: 'Full system access',
        isSystemRole: true,
        permissions: ['view_dashboard', 'manage_users', 'manage_roles', 'manage_labs', 'provision_labs', 'view_submissions', 'grade_submissions', 'manage_settings', 'view_feedback', 'view_analytics']
    },
    {
        name: 'facilitator',
        description: 'Instructor access',
        isSystemRole: true,
        permissions: ['view_dashboard', 'view_labs', 'manage_users', 'view_submissions', 'grade_submissions', 'view_feedback']
    },
    {
        name: 'lab technician',
        description: 'Technical staff access',
        isSystemRole: true,
        permissions: ['view_dashboard', 'view_labs', 'manage_users', 'view_submissions', 'grade_submissions', 'view_feedback']
    },
    {
        name: 'student',
        description: 'Student access',
        isSystemRole: true,
        permissions: ['view_dashboard', 'view_labs', 'submit_assignments', 'view_grades', 'submit_feedback', 'view_booking_history']
    }
];

const seedDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        // 1. Seed Labs
        for (const labData of labs) {
            await Lab.findOneAndUpdate({ name: labData.name }, labData, { upsert: true });
        }
        console.log('✅ Seeded Labs');

        // 2. Seed Email Templates
        await SystemConfig.findOneAndUpdate(
            { key: 'notification_templates' },
            { key: 'notification_templates', value: emailTemplates },
            { upsert: true }
        );
        console.log('✅ Seeded Email Templates');

        // 3. Seed Roles
        for (const roleData of defaultRoles) {
            await Role.findOneAndUpdate({ name: roleData.name }, roleData, { upsert: true });
        }
        console.log('✅ Seeded Roles');

        // 4. Create Admin
        const adminUsername = 'admin';
        const existingAdmin = await User.findOne({ username: adminUsername });
        if (!existingAdmin) {
            const admin = new User({
                name: 'Admin User',
                username: adminUsername,
                email: 'admin@virtuallab.com',
                password: 'adminpassword123',
                role: 'admin',
                status: 'enrolled',
                programmes: ['Artificial Intelligence', 'Cybersecurity', 'Management Information System']
            });
            await admin.save();
            console.log('✅ Created Admin');
        } else {
            // Update existing admin to have all programmes and reset password to ensure it's hashed
            existingAdmin.password = 'adminpassword123';
            existingAdmin.programmes = ['Artificial Intelligence', 'Cybersecurity', 'Management Information System'];
            existingAdmin.status = 'enrolled';
            await existingAdmin.save();
            console.log('✅ Updated Admin (Password Reset & Programmes)');
        }

        console.log('🌟 Seeding Complete');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
