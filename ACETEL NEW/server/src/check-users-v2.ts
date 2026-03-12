
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from './models/User.model';

dotenv.config();

async function checkUserStatuses() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab');
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'name email role status');
        let output = 'User Statuses:\n';
        users.forEach(u => {
            output += `- ${u.name} (${u.email}) | Role: ${u.role} | Status: ${u.status}\n`;
        });

        fs.writeFileSync('user-status-output.txt', output);
        console.log('Output written to user-status-output.txt');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUserStatuses();
