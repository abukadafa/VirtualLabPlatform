import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Lab from '../models/Lab.model';
import User from '../models/User.model';
import AcademicEvent from '../models/AcademicEvent.model';
import Course from '../models/Course.model';
import Booking from '../models/Booking.model';
import Submission from '../models/Submission.model';
import Session from '../models/Session.model';
import { AuditLog } from '../services/audit-log.service';

dotenv.config();

const purgeData = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB for purging data');

        // Collections to completely clear
        console.log('🧹 Purging operational data...');
        await Lab.deleteMany({});
        await AcademicEvent.deleteMany({});
        await Course.deleteMany({});
        await Booking.deleteMany({});
        await Submission.deleteMany({});
        await Session.deleteMany({});
        await AuditLog.deleteMany({});

        // Users: Delete everyone except 'admin'
        console.log('👤 Purging users (preserving admin)...');
        const deleteResult = await User.deleteMany({ username: { $ne: 'admin' } });
        console.log(`✅ Deleted ${deleteResult.deletedCount} users.`);

        // Ensure at least one admin exists if none remained
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount === 0) {
            console.log('⚠️ No admin found. Re-creating default admin...');
            await User.create({
                name: 'System Admin',
                username: 'admin',
                email: 'admin@acetel.edu.ng',
                password: 'adminpassword123',
                role: 'admin',
                status: 'enrolled',
                programmes: ['MSc Management Information System']
            });
            console.log('✅ Default admin created (admin / adminpassword123)');
        } else {
            console.log('✅ Admin account preserved.');
        }

        console.log('🏁 Data purge completed successfully.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during data purge:', error);
        process.exit(1);
    }
};

purgeData();
