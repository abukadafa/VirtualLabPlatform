
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from './models/User.model';

dotenv.config();

async function checkUserStatuses() {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        console.log('Connecting to:', mongoURI);
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'name email role status');
        let output = 'User Statuses:\n';
        users.forEach(u => {
            output += `- ${u.name} (${u.email}) | Role: ${u.role} | Status: ${u.status}\n`;
        });

        fs.writeFileSync('user-status-output-real.txt', output);
        console.log('Output written to user-status-output-real.txt');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUserStatuses();
