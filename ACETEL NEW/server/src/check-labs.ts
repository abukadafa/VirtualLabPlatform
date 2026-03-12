
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Lab from './models/Lab.model';

dotenv.config();

async function checkLabs() {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        const labs = await Lab.find({});
        let output = 'Current Labs and Statuses:\n';
        labs.forEach(l => {
            output += `- ${l.name} (${l.type}) | Status: ${l.status} | ID: ${l._id}\n`;
        });
        fs.writeFileSync('lab-status-output.txt', output);
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLabs();
