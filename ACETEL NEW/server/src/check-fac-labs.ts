
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from './models/User.model';

dotenv.config();

async function checkUserEnrolledLabs() {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        const users = await User.find({ role: 'facilitator' }, 'name email role status enrolledLabs');
        let output = 'Facilitator Enrolled Labs Raw Data:\n';
        users.forEach(u => {
            output += `\n- Name: ${u.name}\n  Email: ${u.email}\n  EnrolledLabs: ${JSON.stringify(u.enrolledLabs)}\n`;
        });
        fs.writeFileSync('facilitator-labs-raw.txt', output);
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUserEnrolledLabs();
