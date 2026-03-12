
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from './models/User.model';

dotenv.config();

async function simulateLogin(identifier: string, password: string, role?: string) {
    let output = '';
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        output += 'Connected to MongoDB\n';

        output += `\nAttempting login for: ${identifier} as ${role || 'any role'}\n`;

        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) {
            output += 'FAILURE: User not found\n';
            await mongoose.disconnect();
            return output;
        }
        output += `SUCCESS: User found: ${user.email} (Role: ${user.role}, Status: ${user.status})\n`;

        const isMatch = await user.comparePassword(password);
        output += `Password match: ${isMatch}\n`;

        if (role && user.role !== role) {
            output += `FAILURE: Role mismatch. User is ${user.role}, but logging in as ${role}\n`;
        } else {
            output += 'SUCCESS: Role match\n';
        }

        if (user.status !== 'enrolled') {
            output += `FAILURE: Status is ${user.status}, not enrolled\n`;
        } else {
            output += 'SUCCESS: Status is enrolled\n';
        }

        await mongoose.disconnect();
    } catch (error: any) {
        output += `Error: ${error.message}\n`;
    }
    return output;
}

async function runTests() {
    let finalLog = '';
    // Test with correct password and different cases
    finalLog += await simulateLogin('admin@virtuallab.com', 'adminpassword123', 'admin');
    finalLog += '-------------------\n';
    finalLog += await simulateLogin('Admin@virtuallab.com', 'adminpassword123', 'admin');
    finalLog += '-------------------\n';
    finalLog += await simulateLogin('ADMIN@VIRTUALLAB.COM', 'adminpassword123', 'admin');

    fs.writeFileSync('simulate-login-results.txt', finalLog);
}

runTests();
