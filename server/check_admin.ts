import mongoose from 'mongoose';
import User from './src/models/User.model';
import dotenv from 'dotenv';

dotenv.config();

const check = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/virtuallab';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        
        const admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            console.log('❌ Admin user NOT FOUND');
        } else {
            console.log('✅ Admin user FOUND');
            console.log('Username:', admin.username);
            console.log('Email:', admin.email);
            console.log('Role:', admin.role);
            console.log('Status:', admin.status);
            console.log('isDeleted:', admin.isDeleted);
            
            const testPass = 'adminpassword123';
            const isMatch = await admin.comparePassword(testPass);
            console.log(`Testing password "${testPass}":`, isMatch ? 'MATCH ✅' : 'NO MATCH ❌');
        }
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
};

check();
