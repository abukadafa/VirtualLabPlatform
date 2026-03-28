import mongoose from 'mongoose';
import User from '../src/models/User.model';
import dotenv from 'dotenv';

dotenv.config();

const reset = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ username: /absteve/i });
        if (user) {
            console.log('Found user:', user.username);
            user.username = 'absteve';
            user.password = 'Absteve'; // This should be hashed by the pre-save hook
            await user.save();
            console.log('✅ Password and Username reset for absteve');
        } else {
            console.log('❌ User absteve not found');
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
};

reset();
