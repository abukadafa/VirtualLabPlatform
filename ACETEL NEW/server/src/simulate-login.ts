
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model';

dotenv.config();

async function simulateLogin(identifier: string, password: string, role?: string) {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // SIMULATE CODE FROM AUTH CONTROLLER
        console.log(`\nAttempting login for: ${identifier} as ${role || 'any role'}`);

        // 1. Find user
        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) {
            console.log('FAILURE: User not found');
            await mongoose.disconnect();
            return;
        }
        console.log(`SUCCESS: User found: ${user.email} (Role: ${user.role}, Status: ${user.status})`);

        // 2. Verify password (skipped in simulation for simplicity as we know it)
        const isMatch = await user.comparePassword(password);
        console.log(`Password match: ${isMatch}`);

        // 3. Verify role
        if (role && user.role !== role) {
            console.log(`FAILURE: Role mismatch. User is ${user.role}, but logging in as ${role}`);
        } else {
            console.log('SUCCESS: Role match');
        }

        // 4. Check status
        if (user.status !== 'enrolled') {
            console.log(`FAILURE: Status is ${user.status}, not enrolled`);
        } else {
            console.log('SUCCESS: Status is enrolled');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Test case 1: Admin with case-sensitive email
simulateLogin('Admin@virtuallab.com', 'admin123', 'admin');
// Test case 2: Admin with lowercase email
simulateLogin('admin@virtuallab.com', 'admin123', 'admin');
// Test case 3: Admin with incorrect role selection (e.g. forgot to change from student)
simulateLogin('admin@virtuallab.com', 'admin123', 'student');
