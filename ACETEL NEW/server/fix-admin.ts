import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';

async function fixAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            console.log('Admin found:', admin.email);
            if (!admin.username) {
                admin.username = 'admin';
                console.log('Setting username to "admin"');
            }
            // Ensure status is enrolled
            admin.status = 'enrolled';

            await admin.save();
            console.log('Admin user updated successfully');
        } else {
            console.log('No admin user found. Please check your seed script.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error fixing admin:', error);
        process.exit(1);
    }
}

fixAdmin();
