
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './models/User.model';

dotenv.config();

async function checkUserStatuses() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab');
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'name email role status');
        console.log('User Statuses:');
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) | Role: ${u.role} | Status: ${u.status}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUserStatuses();
