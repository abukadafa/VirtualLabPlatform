import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model';
import Role from '../models/Role.model';

dotenv.config();

const verify = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const labTechRole = await Role.findOne({ name: 'lab technician' });
        console.log('Lab Technician Role:', JSON.stringify(labTechRole, null, 2));

        const labTechUsers = await User.find({ role: 'lab technician' });
        console.log('Lab Technician Users count:', labTechUsers.length);
        labTechUsers.forEach(u => {
            console.log(`User: ${u.username}, Email: ${u.email}, Status: ${u.status}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
};

verify();
